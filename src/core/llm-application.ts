import createDebugMessages from 'debug';

import { BaseDb } from '../interfaces/base-db.js';
import { BaseLoader } from '../interfaces/base-loader.js';
import { AddLoaderReturn, Chunk, EmbeddedChunk } from '../global/types.js';
import { LLMApplicationBuilder } from './llm-application-builder.js';
import { DEFAULT_INSERT_BATCH_SIZE } from '../global/constants.js';
import { cleanString, stringFormat } from '../util/strings.js';
import { BaseModel } from '../interfaces/base-model.js';
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
    private readonly model: BaseModel;

    constructor(llmBuilder: LLMApplicationBuilder) {
        this.model = llmBuilder.getModel();
        this.loaders = llmBuilder.getLoaders();
        this.vectorDb = llmBuilder.getVectorDb();
        this.queryTemplate = llmBuilder.getQueryTemplate();
        this.searchResultCount = llmBuilder.getSearchResultCount();
        this.cache = llmBuilder.getCache();
        this.initLoaders = llmBuilder.getLoaderInit();

        LLMEmbedding.init(llmBuilder.getEmbeddingModel());
        if (!this.model) throw new SyntaxError('Model not set');
        if (!this.vectorDb) throw new SyntaxError('VectorDb not set');
    }

    private async embedChunks(chunks: Pick<Chunk, 'pageContent'>[]) {
        const texts = chunks.map(({ pageContent }) => pageContent);
        return LLMEmbedding.getEmbedding().embedDocuments(texts);
    }

    private getChunkUniqueId(loaderUniqueId: string, chunkId: number) {
        return `${loaderUniqueId}_${chunkId}`;
    }

    public async init() {
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

    private async batchLoadEmbeddings(loaderUniqueId: string, formattedChunks: Chunk[]) {
        if (formattedChunks.length === 0) return 0;

        const embeddings = await this.embedChunks(formattedChunks);
        this.debug(`Batch embeddings (size ${formattedChunks.length}) obtained for loader`, loaderUniqueId);

        const embedChunks = formattedChunks.map((chunk, index) => {
            return <EmbeddedChunk>{
                pageContent: chunk.pageContent,
                vector: embeddings[index],
                metadata: chunk.metadata,
            };
        });

        return this.vectorDb.insertChunks(embedChunks);
    }

    public async addLoader(loader: BaseLoader): Promise<AddLoaderReturn> {
        const uniqueId = loader.getUniqueId();
        this.debug('Add loader called for', uniqueId);
        await loader.init();

        const chunks = await loader.getChunks();
        if (this.cache && (await this.cache.hasLoader(uniqueId))) {
            const { chunkCount: previousChunkCount } = await this.cache.getLoader(uniqueId);

            const chunkIds: string[] = [];
            for (let i = 0; i < previousChunkCount; i++) {
                chunkIds.push(this.getChunkUniqueId(uniqueId, i));
            }

            this.debug(`Loader previously run. Deleting previous ${chunkIds.length} keys`, uniqueId);
            await this.vectorDb.deleteKeys(chunkIds);
        }

        let batchSize = 0,
            newInserts = 0,
            formattedChunks: Chunk[] = [];
        for await (const chunk of chunks) {
            batchSize++;

            const formattedChunk = {
                pageContent: chunk.pageContent,
                metadata: {
                    ...chunk.metadata,
                    id: this.getChunkUniqueId(uniqueId, chunk.metadata.chunkId),
                },
            };
            formattedChunks.push(formattedChunk);

            if (batchSize % DEFAULT_INSERT_BATCH_SIZE === 0) {
                newInserts += await this.batchLoadEmbeddings(uniqueId, formattedChunks);
                formattedChunks = [];
                batchSize = 0;
            }
        }
        newInserts += await this.batchLoadEmbeddings(uniqueId, formattedChunks);

        if (this.cache) await this.cache.addLoader(uniqueId, formattedChunks.length);
        this.debug(`Add loader completed with ${newInserts} new entries for`, uniqueId);
        return { entriesAdded: newInserts, uniqueId };
    }

    public async getEmbeddingsCount(): Promise<number> {
        return this.vectorDb.getVectorCount();
    }

    public async deleteAllEmbeddings(areYouSure: boolean = false) {
        if (!areYouSure) {
            console.warn('Reset embeddings called without confirmation. No action taken.');
            return;
        }

        await this.vectorDb.reset();
    }

    public async getEmbeddings(cleanQuery: string) {
        const queryEmbedded = await LLMEmbedding.getEmbedding().embedQuery(cleanQuery);
        return this.vectorDb.similaritySearch(queryEmbedded, this.searchResultCount);
    }

    public async getContext(query: string) {
        const cleanQuery = cleanString(query);
        const contextChunks = await this.getEmbeddings(cleanQuery);

        const prompt = cleanString(stringFormat(this.queryTemplate, cleanQuery));

        return {
            prompt,
            supportingContext: contextChunks,
        };
    }

    public async query(query: string, newChat = false): Promise<string> {
        const context = await this.getContext(query);
        return this.model.query(context.prompt, context.supportingContext, newChat);
    }

    public async resetChainExecutor() {
        await this.model.resetContext();
    }
}
