import { OpenAI } from '@langchain/openai';
import { BufferMemory } from 'langchain/memory';
import { ConversationChain } from 'langchain/chains';

import { BaseDb } from '../interfaces/base-db.js';
import { BaseLoader } from '../interfaces/base-loader.js';
import { LLMApplicationBuilder } from './llm-application-builder.js';
import { Chunk, EmbeddedChunk } from '../global/types.js';
import { LLMEmbedding } from './llm-embedding.js';
import { cleanString, filterAsync, stringFormat } from '../global/utils.js';
import { BaseCache } from '../interfaces/base-cache.js';

export class LLMApplication {
    private readonly initLoaders: boolean;
    private readonly queryTemplate: string;
    private readonly searchResultCount: number;
    private readonly loaders: BaseLoader[];
    private readonly cache?: BaseCache;
    private readonly vectorDb: BaseDb;
    private readonly model: OpenAI;

    private executor: ConversationChain;

    constructor(llmBuilder: LLMApplicationBuilder) {
        this.loaders = llmBuilder.getLoaders();
        this.vectorDb = llmBuilder.getVectorDb();
        this.queryTemplate = llmBuilder.getQueryTemplate();
        this.searchResultCount = llmBuilder.getSearchResultCount();
        this.cache = llmBuilder.getCache();
        this.initLoaders = llmBuilder.getLoaderInit();

        LLMEmbedding.init(llmBuilder.getEmbeddingModel());
        if (!this.vectorDb) throw new SyntaxError('VectorDb not set');
        this.model = new OpenAI({ temperature: llmBuilder.getTemperature(), modelName: llmBuilder.getModel() });
    }

    private async embedChunks(chunks: Chunk[]) {
        const texts = chunks.map(({ pageContent }) => pageContent);
        return LLMEmbedding.getEmbedding().embedDocuments(texts);
    }

    async init() {
        await this.vectorDb.init({ dimensions: LLMEmbedding.getEmbedding().getDimensions() });
        if (this.cache) await this.cache.init();

        if (this.initLoaders) {
            for await (const loader of this.loaders) {
                await this.addLoader(loader);
            }
        }
    }

    async resetChainExecutor() {
        const memory = new BufferMemory();
        this.executor = new ConversationChain({ llm: this.model, memory });
    }

    async addLoader(loader: BaseLoader): Promise<number> {
        const uniqueId = loader.getUniqueId();
        if (this.cache && (await this.cache.hasSeen(uniqueId))) return 0;

        const chunks = await loader.getChunks();
        const newChunks = this.cache
            ? await filterAsync(chunks, async (chunk) => {
                  return !(await this.cache.hasSeen(chunk.metadata.id));
              })
            : chunks;
        if (newChunks.length === 0) return 0;

        const embeddings = await this.embedChunks(newChunks);
        const embedChunks = newChunks.map((chunk, index) => {
            return <EmbeddedChunk>{
                pageContent: chunk.pageContent,
                vector: embeddings[index],
                metadata: chunk.metadata,
            };
        });

        const newInserts = await this.vectorDb.insertChunks(embedChunks);
        if (this.cache) {
            await Promise.all(
                newChunks.map(async (chunk) => {
                    return this.cache.addSeen(chunk.metadata.id);
                }),
            );

            await this.cache.addSeen(uniqueId);
        }

        return newInserts;
    }

    async getEmbeddingsCount(): Promise<number> {
        return this.vectorDb.getVectorCount();
    }

    async deleteAllEmbeddings(areYouSure: boolean = false) {
        if (!areYouSure) {
            console.warn('Reset embeddings called without confirmation. No action taken.');
            return;
        }

        await this.vectorDb.reset();
    }

    async getEmbeddings(cleanQuery: string) {
        const queryEmbedded = await LLMEmbedding.getEmbedding().embedQuery(cleanQuery);
        return this.vectorDb.similaritySearch(queryEmbedded, this.searchResultCount);
    }

    async getContext(query: string) {
        const cleanQuery = cleanString(query);
        const contextChunks = await this.getEmbeddings(cleanQuery);

        const prompt = cleanString(stringFormat(this.queryTemplate, cleanQuery));

        return {
            prompt,
            supportingContext: contextChunks,
        };
    }

    async query(query: string, newChat = false): Promise<string> {
        const context = await this.getContext(query);

        if (this.executor === undefined || newChat) await this.resetChainExecutor();

        const result = await this.executor.call({
            input: `${context.prompt} \nSupporting documents:\n${JSON.stringify(context.supportingContext)}`,
        });

        return result.response;
    }
}
