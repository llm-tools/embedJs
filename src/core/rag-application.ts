import createDebugMessages from 'debug';

import { BaseDb } from '../interfaces/base-db.js';
import { BaseLoader } from '../interfaces/base-loader.js';
import { AddLoaderReturn, Chunk, InsertChunkData, LoaderChunk, ConversationEntry } from '../global/types.js';
import { DynamicLoader, LoaderParam } from './dynamic-loader-selector.js';
import { RAGApplicationBuilder } from './rag-application-builder.js';
import { DEFAULT_INSERT_BATCH_SIZE } from '../global/constants.js';
import { BaseModel } from '../interfaces/base-model.js';
import { BaseCache } from '../interfaces/base-cache.js';
import { BaseConversations } from '../interfaces/base-conversations.js';
import { RAGEmbedding } from './rag-embedding.js';
import { cleanString } from '../util/strings.js';
import { OpenAi3SmallEmbeddings } from '../index.js';
import { InMemoryConversations } from '../conversations/memory-conversations.js';
import { getUnique } from '../util/arrays.js';

export class RAGApplication {
    private readonly debug = createDebugMessages('embedjs:core');
    private readonly queryTemplate: string;
    private readonly searchResultCount: number;
    private readonly cache?: BaseCache;
    private readonly vectorDb: BaseDb;
    private readonly model: BaseModel;
    private readonly embeddingRelevanceCutOff: number;

    private readonly rawLoaders: LoaderParam[];
    private loaders: BaseLoader[];
    private readonly conversations: BaseConversations;

    constructor(llmBuilder: RAGApplicationBuilder) {
        this.cache = llmBuilder.getCache();
        BaseLoader.setCache(this.cache);

        this.model = llmBuilder.getModel();
        BaseModel.setDefaultTemperature(llmBuilder.getTemperature());
        if (!this.model) this.debug('No base model set; query function unavailable!');

        this.conversations = llmBuilder.getConversations() || new InMemoryConversations();
        BaseModel.setConversations(this.conversations);  // Use the set conversations

        this.queryTemplate = cleanString(llmBuilder.getQueryTemplate());
        this.debug(`Using system query template - "${this.queryTemplate}"`);

        this.vectorDb = llmBuilder.getVectorDb();
        if (!this.vectorDb) throw new SyntaxError('VectorDb not set');

        this.rawLoaders = llmBuilder.getLoaders();
        this.searchResultCount = llmBuilder.getSearchResultCount();
        this.embeddingRelevanceCutOff = llmBuilder.getEmbeddingRelevanceCutOff();

        RAGEmbedding.init(llmBuilder.getEmbeddingModel() ?? new OpenAi3SmallEmbeddings());
    }

    /**
     * The function `embedChunks` embeds the content of chunks by invoking the planned embedding model.
     * @param {Pick<Chunk, 'pageContent'>[]} chunks - The `chunks` parameter is an array of objects
     * that have a property `pageContent` which contains text content for each chunk.
     * @returns The `embedChunks` function is returning the embedded vectors for the chunks.
     */
    private async embedChunks(chunks: Pick<Chunk, 'pageContent'>[]) {
        const texts = chunks.map(({ pageContent }) => pageContent);
        return RAGEmbedding.getEmbedding().embedDocuments(texts);
    }

    /**
     * The function `getChunkUniqueId` generates a unique identifier by combining a loader unique ID and
     * an increment ID.
     * @param {string} loaderUniqueId - A unique identifier for the loader.
     * @param {number} incrementId - The `incrementId` parameter is a number that represents the
     * increment value used to generate a unique chunk identifier.
     * @returns The function `getChunkUniqueId` returns a string that combines the `loaderUniqueId` and
     * `incrementId`.
     */
    private getChunkUniqueId(loaderUniqueId: string, incrementId: number) {
        return `${loaderUniqueId}_${incrementId}`;
    }

    /**
     * This async function initializes various components such as loaders, model, vector database,
     * cache, and pre-loaders.
     */
    public async init() {
        this.loaders = await DynamicLoader.createLoaders(this.rawLoaders);

        if (this.model) {
            await this.model.init();
            this.debug('Initialized LLM class');
        }

        await this.vectorDb.init({ dimensions: RAGEmbedding.getEmbedding().getDimensions() });
        this.debug('Initialized vector database');

        if (this.cache) {
            await this.cache.init();
            this.debug('Initialized cache');
        }

        this.loaders = getUnique(this.loaders, 'getUniqueId');
        for await (const loader of this.loaders) {
            await this.addLoader(loader);
        }
        this.debug('Initialized pre-loaders');
    }

    /**
     * The function `addLoader` asynchronously initalizes a loader using the provided parameters and adds
     * it to the system.
     * @param {LoaderParam} loaderParam - The `loaderParam` parameter is a string, object or instance of BaseLoader
     * that contains the necessary information to create a loader.
     * @returns The function `addLoader` returns an object with the following properties:
     * - `entriesAdded`: Number of new entries added during the loader operation
     * - `uniqueId`: Unique identifier of the loader
     * - `loaderType`: Name of the loader's constructor class
     */
    public async addLoader(loaderParam: LoaderParam): Promise<AddLoaderReturn> {
        const loader = await DynamicLoader.createLoader(loaderParam);
        return this._addLoader(loader);
    }

    /**
     * The function `_addLoader` asynchronously adds a loader, processes its chunks, and handles
     * incremental loading if supported by the loader.
     * @param {BaseLoader} loader - The `loader` parameter in the `_addLoader` method is an instance of the
     * `BaseLoader` class.
     * @returns The function `_addLoader` returns an object with the following properties:
     * - `entriesAdded`: Number of new entries added during the loader operation
     * - `uniqueId`: Unique identifier of the loader
     * - `loaderType`: Name of the loader's constructor class
     */
    private async _addLoader(loader: BaseLoader): Promise<AddLoaderReturn> {
        const uniqueId = loader.getUniqueId();
        this.debug('Add loader called for', uniqueId);
        await loader.init();

        const chunks = await loader.getChunks();
        if (this.cache && (await this.cache.hasLoader(uniqueId))) {
            const { chunkCount: previousChunkCount } = await this.cache.getLoader(uniqueId);

            this.debug(`Loader previously run. Deleting previous ${previousChunkCount} keys`, uniqueId);
            if (previousChunkCount > 0) {
                await this.deleteLoader(uniqueId, true);
            }
        }

        const { newInserts, formattedChunks } = await this.batchLoadChunks(uniqueId, chunks);
        if (this.cache) await this.cache.addLoader(uniqueId, formattedChunks.length);
        this.debug(`Add loader completed with ${newInserts} new entries for`, uniqueId);

        if (loader.canIncrementallyLoad) {
            this.debug(`Registering incremental loader`, uniqueId);

            loader.on('incrementalChunkAvailable', async (incrementalGenerator) => {
                await this.incrementalLoader(uniqueId, incrementalGenerator);
            });
        }

        this.loaders = this.loaders.filter((x) => x.getUniqueId() != loader.getUniqueId());
        this.loaders.push(loader);

        this.debug(`Add loader ${uniqueId} wrap`);
        return { entriesAdded: newInserts, uniqueId, loaderType: loader.constructor.name };
    }

    /**
     * The `incrementalLoader` function asynchronously processes incremental chunks for a loader.
     * @param {string} uniqueId - The `uniqueId` parameter is a string that serves as an identifier for
     * the loader.
     * @param incrementalGenerator - The `incrementalGenerator` parameter is an asynchronous generator
     * function that yields `LoaderChunk` objects. It is used to incrementally load chunks of data for a specific loader
     */
    private async incrementalLoader(uniqueId: string, incrementalGenerator: AsyncGenerator<LoaderChunk, void, void>) {
        this.debug(`incrementalChunkAvailable for loader`, uniqueId);
        const { newInserts } = await this.batchLoadChunks(uniqueId, incrementalGenerator);
        this.debug(`${newInserts} new incrementalChunks processed`, uniqueId);
    }

    /**
     * The function `getLoaders` asynchronously retrieves a list of loaders loaded so far. This includes
     * internal loaders that were loaded by other loaders. It requires that cache is enabled to work.
     * @returns The list of loaders with some metadata about them.
     */
    public async getLoaders() {
        return BaseLoader.getLoadersList();
    }

    /**
     * The function `deleteLoader` deletes embeddings from a loader after confirming the action.
     * @param {string} uniqueLoaderId - The `uniqueLoaderId` parameter is a string that represents the
     * identifier of the loader that you want to delete.
     * @param {boolean} [areYouSure=false] - The `areYouSure` parameter is a boolean flag that
     * indicates whether the user has confirmed their intention to delete embeddings from a loader. If
     * `areYouSure` is `true`, the function proceeds with the deletion process. If `areYouSure` is
     * `false`, a warning message is logged and no action is taken
     * @returns The `deleteLoader` method returns a boolean value indicating the success of the operation.
     */
    public async deleteLoader(uniqueLoaderId: string, areYouSure: boolean = false) {
        if (!areYouSure) {
            console.warn('Delete embeddings from loader called without confirmation. No action taken.');
            return false;
        }

        const deleteResult = await this.vectorDb.deleteKeys(uniqueLoaderId);
        if (this.cache && deleteResult) await this.cache.deleteLoader(uniqueLoaderId);
        this.loaders = this.loaders.filter((x) => x.getUniqueId() != uniqueLoaderId);
        return deleteResult;
    }

    /**
     * The function `batchLoadChunks` processes chunks of data in batches and formats them for insertion.
     * @param {string} uniqueId - The `uniqueId` parameter is a string that represents a unique
     * identifier for loader being processed.
     * @param incrementalGenerator - The `incrementalGenerator` parameter in the `batchLoadChunks`
     * function is an asynchronous generator that yields `LoaderChunk` objects.
     * @returns The `batchLoadChunks` function returns an object with two properties:
     * 1. `newInserts`: The total number of new inserts made during the batch loading process.
     * 2. `formattedChunks`: An array containing the formatted chunks that were processed during the
     * batch loading process.
     */
    private async batchLoadChunks(uniqueId: string, incrementalGenerator: AsyncGenerator<LoaderChunk, void, void>) {
        let i = 0,
            batchSize = 0,
            newInserts = 0,
            formattedChunks: Chunk[] = [];

        for await (const chunk of incrementalGenerator) {
            batchSize++;

            const formattedChunk = {
                pageContent: chunk.pageContent,
                metadata: {
                    ...chunk.metadata,
                    uniqueLoaderId: uniqueId,
                    id: this.getChunkUniqueId(uniqueId, i++),
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
        return { newInserts, formattedChunks };
    }

    /**
     * The function `batchLoadEmbeddings` asynchronously loads embeddings for formatted chunks and
     * inserts them into a vector database.
     * @param {string} loaderUniqueId - The `loaderUniqueId` parameter is a unique identifier for the
     * loader that is used to load embeddings.
     * @param {Chunk[]} formattedChunks - `formattedChunks` is an array of Chunk objects that contain
     * page content, metadata, and other information needed for processing. The `batchLoadEmbeddings`
     * function processes these chunks in batches to obtain embeddings for each chunk and then inserts
     * them into a database for further use.
     * @returns The function `batchLoadEmbeddings` returns the result of inserting the embed chunks
     * into the vector database.
     */
    private async batchLoadEmbeddings(loaderUniqueId: string, formattedChunks: Chunk[]) {
        if (formattedChunks.length === 0) return 0;

        this.debug(`Processing batch (size ${formattedChunks.length}) for loader ${loaderUniqueId}`);
        const embeddings = await this.embedChunks(formattedChunks);
        this.debug(`Batch embeddings (size ${formattedChunks.length}) obtained for loader ${loaderUniqueId}`);

        const embedChunks = formattedChunks.map((chunk, index) => {
            return <InsertChunkData>{
                pageContent: chunk.pageContent,
                vector: embeddings[index],
                metadata: chunk.metadata,
            };
        });

        this.debug(`Inserting chunks for loader ${loaderUniqueId} to vectorDb`);
        return this.vectorDb.insertChunks(embedChunks);
    }

    /**
     * The function `getEmbeddingsCount` returns the count of embeddings stored in a vector database
     * asynchronously.
     * @returns The `getEmbeddingsCount` method is returning the number of embeddings stored in the
     * vector database. It is an asynchronous function that returns a Promise with the count of
     * embeddings as a number.
     */
    public async getEmbeddingsCount(): Promise<number> {
        return this.vectorDb.getVectorCount();
    }

    /**
     * The function `deleteAllEmbeddings` deletes all embeddings from the vector database if a
     * confirmation is provided.
     * @param {boolean} [areYouSure=false] - The `areYouSure` parameter is a boolean parameter that
     * serves as a confirmation flag. It is used to ensure that the deletion of all embeddings is
     * intentional and requires the caller to explicitly confirm by passing `true` as the value. If
     * `areYouSure` is `false`, a warning message is logged.
     * @returns The `deleteAllEmbeddings` function returns a boolean value indicating the result.
     */
    public async deleteAllEmbeddings(areYouSure: boolean = false) {
        if (!areYouSure) {
            console.warn('Reset embeddings called without confirmation. No action taken.');
            return false;
        }

        await this.vectorDb.reset();
        return true;
    }

    /**
     * The function `getEmbeddings` retrieves embeddings for a query, performs similarity search,
     * filters and sorts the results based on relevance score, and returns a subset of the top results.
     * @param {string} cleanQuery - The `cleanQuery` parameter is a string that represents the query
     * input after it has been cleaned or processed to remove any unnecessary characters, symbols, or
     * noise. This clean query is then used to generate embeddings for similarity search.
     * @returns The `getEmbeddings` function returns a filtered and sorted array of search results based
     * on the similarity score of the query embedded in the cleanQuery string. The results are filtered
     * based on a relevance cutoff value, sorted in descending order of score, and then sliced to return
     * only the number of results specified by the `searchResultCount` property.
     */
    public async getEmbeddings(cleanQuery: string) {
        const queryEmbedded = await RAGEmbedding.getEmbedding().embedQuery(cleanQuery);
        const unfilteredResultSet = await this.vectorDb.similaritySearch(queryEmbedded, this.searchResultCount + 10);
        this.debug(`Query resulted in ${unfilteredResultSet.length} chunks before filteration...`);

        return unfilteredResultSet
            .filter((result) => result.score > this.embeddingRelevanceCutOff)
            .sort((a, b) => b.score - a.score)
            .slice(0, this.searchResultCount);
    }

    /**
     * The getContext function retrieves the unique embeddings for a given query without calling a LLM.
     * @param {string} query - The `query` parameter is a string that represents the input query that
     * needs to be processed.
     * @returns An array of unique page content items / chunks.
     */
    public async getContext(query: string) {
        const cleanQuery = cleanString(query);
        const rawContext = await this.getEmbeddings(cleanQuery);

        return [...new Map(rawContext.map((item) => [item.pageContent, item])).values()];
    }

    /**
     * This function takes a user query, retrieves relevant context, identifies unique sources, and
     * returns the query result along with the list of sources.
     * @param {string} userQuery - The `userQuery` parameter is a string that represents the query
     * input provided by the user. It is used as input to retrieve context and ultimately generate a
     * result based on the query.
     * @param {string} [conversationId] - The `conversationId` parameter in the `query` method is an
     * optional parameter that represents the unique identifier for a conversation. It allows you to
     * track and associate the query with a specific conversation thread if needed. If provided, it can be
     * used to maintain context or history related to the conversation.
     * @returns The `query` method returns a Promise that resolves to an object with two properties:
     * `result` and `sources`. The `result` property is a string representing the result of querying
     * the LLM model with the provided query template, user query, context, and conversation history. The
     * `sources` property is an array of strings representing unique sources used to generate the LLM response.
     */
    public async query(
        userQuery: string,
        conversationId?: string,
        context?: Chunk[]
    ): Promise<ConversationEntry> {
        if (!this.model) {
            throw new Error('LLM Not set; query method not available');
        }

        if (!context) {
            context = await this.getContext(userQuery);
        }
        const sources = [...new Set(context.map((chunk) => chunk.metadata.source))];
        this.debug(
            `Query resulted in ${context.length} chunks after filteration; chunks from ${sources.length} unique sources.`,
        );

        var result = await this.model.query(this.queryTemplate, userQuery, context, conversationId)

        return result;
    }

}
