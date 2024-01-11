import { OpenAI } from '@langchain/openai';
import { BufferMemory } from 'langchain/memory';
import { ConversationChain } from 'langchain/chains';
import createDebugMessages from 'debug';
import md5 from 'md5';

import { BaseDb } from '../interfaces/base-db.js';
import { BaseLoader } from '../interfaces/base-loader.js';
import { LLMApplicationBuilder } from './llm-application-builder.js';
import { cleanString, stringFormat } from '../global/utils.js';
import { AddLoaderReturn, Chunk, EmbeddedChunk } from '../global/types.js';
import { BaseCache } from '../interfaces/base-cache.js';
import { LLMEmbedding } from './llm-embedding.js';

export class LLMApplication {
    private readonly debug = createDebugMessages('embedjs:core');
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

    private async embedChunks(chunks: Pick<Chunk, 'pageContent'>[]) {
        const texts = chunks.map(({ pageContent }) => pageContent);
        return LLMEmbedding.getEmbedding().embedDocuments(texts);
    }

    private getChunkUniqueId(loaderUniqueId: string, chunkId: number) {
        return `${loaderUniqueId}_${chunkId}`;
    }

    async init() {
        await this.vectorDb.init({ dimensions: LLMEmbedding.getEmbedding().getDimensions() });
        this.debug('Initialized vector database');

        if (this.cache) {
            await this.cache.init();
            this.debug('Initialized cache');
        }

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

    async addLoader(loader: BaseLoader): Promise<AddLoaderReturn> {
        const uniqueId = loader.getUniqueId();
        this.debug('Add loader called for', uniqueId);
        await loader.init();

        const chunks = await loader.getChunks();
        this.debug(`Chunks count ${chunks.length}`, uniqueId);
        if (chunks.length === 0) return { entriesAdded: 0, uniqueId };

        const chunkSeenHash = md5(chunks.map((c) => c.contentHash).reduce((p, c) => `${p}_${c}`, ''));
        if (this.cache && (await this.cache.hasLoader(uniqueId))) {
            const { chunkCount: previousChunkCount, chunkSeenHash: previousChunkSeenHash } =
                await this.cache.getLoader(uniqueId);

            if (chunks.length === previousChunkCount && chunkSeenHash === previousChunkSeenHash) {
                this.debug('Skipping chunk delete and returning as loader is unchanged', uniqueId);
                return { entriesAdded: 0, uniqueId };
            }

            const chunkIds: string[] = [];
            for (let i = 0; i < previousChunkCount; i++) {
                chunkIds.push(this.getChunkUniqueId(uniqueId, i));
            }

            this.debug(
                `Loader previously run but chunks are different. Deleting previous ${chunkIds.length} keys`,
                uniqueId,
            );
            await this.vectorDb.deleteKeys(chunkIds);
        }

        const formattedChunks: Chunk[] = chunks.map((chunk) => ({
            pageContent: chunk.pageContent,
            metadata: {
                ...chunk.metadata,
                id: this.getChunkUniqueId(uniqueId, chunk.metadata.chunkId),
            },
        }));

        const embeddings = await this.embedChunks(formattedChunks);
        this.debug('Embeddings obtained for loader', uniqueId);
        const embedChunks = formattedChunks.map((chunk, index) => {
            return <EmbeddedChunk>{
                pageContent: chunk.pageContent,
                vector: embeddings[index],
                metadata: chunk.metadata,
            };
        });

        const newInserts = await this.vectorDb.insertChunks(embedChunks);
        if (this.cache) await this.cache.addLoader(uniqueId, formattedChunks.length, chunkSeenHash);
        this.debug(`Add loader completed with new ${newInserts} entries for`, uniqueId);
        return { entriesAdded: newInserts, uniqueId };
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
