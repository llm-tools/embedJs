import { OpenAI } from 'langchain/llms/openai';
import { loadQAMapReduceChain } from 'langchain/chains';

import { BaseDb } from '../interfaces/base-db.js';
import { BaseLoader } from '../interfaces/base-loader.js';
import { LLMApplicationBuilder } from './llm-application-builder.js';
import { Chunk, EmbeddedChunk } from '../global/types.js';
import { LLMEmbedding } from './llm-embedding.js';
import { cleanString, filterAsync, stringFormat } from '../global/utils.js';
import { BaseCache } from '../interfaces/base-cache.js';

export class LLMApplication {
    private readonly queryTemplate: string;
    private readonly searchResultCount: number;
    private readonly loaders: BaseLoader[];
    private readonly cache?: BaseCache;
    private readonly vectorDb: BaseDb;
    private readonly model: OpenAI;

    constructor(llmBuilder: LLMApplicationBuilder) {
        this.loaders = llmBuilder.getLoaders();
        this.vectorDb = llmBuilder.getVectorDb();
        this.queryTemplate = llmBuilder.getQueryTemplate();
        this.searchResultCount = llmBuilder.getSearchResultCount();
        this.cache = llmBuilder.getCache();

        if (!this.vectorDb) throw new SyntaxError('VectorDb not set');
        this.model = new OpenAI({ temperature: llmBuilder.getTemperature() });
    }

    private async embedChunks(chunks: Chunk[]) {
        const texts = chunks.map(({ pageContent }) => pageContent);
        return LLMEmbedding.getInstance().getEmbedding().embedDocuments(texts);
    }

    private async getQueryEmbedding(query: string) {
        return LLMEmbedding.getInstance().getEmbedding().embedQuery(query);
    }

    private translateChunks(chunks: Chunk[]) {
        return LLMEmbedding.getInstance().translateChunks(chunks);
    }

    async init() {
        await this.vectorDb.init();
        if (this.cache) await this.cache.init();

        for await (const loader of this.loaders) {
            await this.addLoader(loader);
        }
    }

    async addLoader(loader: BaseLoader) {
        const uniqueId = loader.getUniqueId();
        if (this.cache && (await this.cache.hasSeen(uniqueId))) return;

        const chunks = await loader.getChunks();
        const newChunks = this.cache
            ? await filterAsync(chunks, async (chunk) => {
                  return this.cache.hasSeen(chunk.metadata.id);
              })
            : chunks;
        if (newChunks.length === 0) return;

        const embeddings = await this.embedChunks(newChunks);
        const embedChunks = newChunks.map((chunk, index) => {
            return <EmbeddedChunk>{
                pageContent: chunk.pageContent,
                vector: embeddings[index],
                metadata: chunk.metadata,
            };
        });

        await this.vectorDb.insertChunks(embedChunks);
        if (this.cache) {
            await Promise.all(
                newChunks.map(async (chunk) => {
                    return this.cache.addSeen(chunk.metadata.id);
                }),
            );

            await this.cache.addSeen(uniqueId);
        }
    }

    async query(query: string): Promise<string> {
        const prompt = stringFormat(this.queryTemplate, query);
        const queryEmbedded = await this.getQueryEmbedding(cleanString(prompt));
        const contextChunks = await this.vectorDb.similaritySearch(queryEmbedded, this.searchResultCount);
        const translatedChunks = this.translateChunks(contextChunks);

        const chain = loadQAMapReduceChain(this.model);
        const response = await chain.call({
            input_documents: translatedChunks,
            question: prompt,
        });

        return <string>response.text;
    }
}
