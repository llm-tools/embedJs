import createDebugMessages from 'debug';

import { RAGApplicationBuilder } from './rag-application-builder.js';
import {
    AddLoaderReturn,
    BaseLoader,
    BaseModel,
    BaseStore,
    BaseVectorDatabase,
    Chunk,
    InsertChunkData,
    LoaderChunk,
    QueryResponse,
    SIMPLE_MODELS,
    DEFAULT_INSERT_BATCH_SIZE,
    BaseEmbeddings,
} from '@llm-tools/embedjs-interfaces';
import { cleanString, getUnique } from '@llm-tools/embedjs-utils';

export class RAGApplication {
    private readonly debug = createDebugMessages('embedjs:core');
    private readonly storeConversationsToDefaultThread: boolean;
    private readonly embeddingRelevanceCutOff: number;
    private readonly searchResultCount: number;
    private readonly systemMessage: string;
    private readonly vectorDatabase: BaseVectorDatabase;
    private readonly embeddingModel: BaseEmbeddings;
    private readonly store: BaseStore;
    private loaders: BaseLoader[];
    private model: BaseModel;

    constructor(llmBuilder: RAGApplicationBuilder) {
        if (!llmBuilder.getEmbeddingModel()) throw new Error('Embedding model must be set!');
        this.embeddingModel = llmBuilder.getEmbeddingModel();

        this.storeConversationsToDefaultThread = llmBuilder.getParamStoreConversationsToDefaultThread();
        this.store = llmBuilder.getStore();
        BaseLoader.setCache(this.store);
        BaseModel.setStore(this.store);

        this.systemMessage = cleanString(llmBuilder.getSystemMessage());
        this.debug(`Using system query template - "${this.systemMessage}"`);

        this.vectorDatabase = llmBuilder.getVectorDatabase();
        if (!this.vectorDatabase) throw new SyntaxError('vectorDatabase not set');

        this.searchResultCount = llmBuilder.getSearchResultCount();
        this.embeddingRelevanceCutOff = llmBuilder.getEmbeddingRelevanceCutOff();
    }

    /**
     * The function initializes various components of a language model using provided configurations
     * and data. This is an internal method and does not need to be invoked manually.
     * @param {RAGApplicationBuilder} llmBuilder - The `llmBuilder` parameter in the `init` function is
     * an instance of the `RAGApplicationBuilder` class. It is used to build and configure a Language
     * Model (LLM) for a conversational AI system. The function initializes various components of the
     * LLM based on the configuration provided
     */
    public async init(llmBuilder: RAGApplicationBuilder) {
        await this.embeddingModel.init();

        this.model = await this.getModel(llmBuilder.getModel());
        if (!this.model) this.debug('No base model set; query function unavailable!');
        else BaseModel.setDefaultTemperature(llmBuilder.getTemperature());

        this.loaders = llmBuilder.getLoaders();

        if (this.model) {
            await this.model.init();
            this.debug('Initialized LLM class');
        }

        await this.vectorDatabase.init({ dimensions: await this.embeddingModel.getDimensions() });
        this.debug('Initialized vector database');

        if (this.store) {
            await this.store.init();
            this.debug('Initialized cache');
        }

        this.loaders = getUnique(this.loaders, 'getUniqueId');
        for await (const loader of this.loaders) {
            await this.addLoader(loader);
        }
        this.debug('Initialized pre-loaders');
    }

    /**
     * The function getModel retrieves a specific BaseModel or SIMPLE_MODEL based on the input provided.
     * @param {BaseModel | SIMPLE_MODELS | null} model - The `getModel` function you provided is an
     * asynchronous function that takes a parameter `model` of type `BaseModel`, `SIMPLE_MODELS`, or
     * `null`.
     * @returns The `getModel` function returns a Promise that resolves to a `BaseModel` object. If the
     * `model` parameter is an object, it returns the object itself. If the `model` parameter is
     * `null`, it returns `null`. If the `model` parameter is a specific value from the `SIMPLE_MODELS`
     * enum, it creates a new `BaseModel` object based on the model name.
     */
    private async getModel(model: BaseModel | SIMPLE_MODELS | null): Promise<BaseModel> {
        if (typeof model === 'object') return model;
        else if (model === null) return null;
        else {
            const { OpenAi } = await import('@llm-tools/embedjs-openai').catch(() => {
                throw new Error('Package `@llm-tools/embedjs-openai` needs to be installed to use OpenAI models');
            });
            this.debug('Dynamically imported OpenAi');

            if (model === SIMPLE_MODELS.OPENAI_GPT4_O) return new OpenAi({ modelName: 'gpt-4o' });
            else if (model === SIMPLE_MODELS['OPENAI_GPT4_TURBO']) return new OpenAi({ modelName: 'gpt-4-turbo' });
            else if (model === SIMPLE_MODELS['OPENAI_GPT3.5_TURBO']) return new OpenAi({ modelName: 'gpt-3.5-turbo' });
            else throw new Error('Invalid model name');
        }
    }

    /**
     * The function `embedChunks` embeds the content of chunks by invoking the planned embedding model.
     * @param {Pick<Chunk, 'pageContent'>[]} chunks - The `chunks` parameter is an array of objects
     * that have a property `pageContent` which contains text content for each chunk.
     * @returns The `embedChunks` function is returning the embedded vectors for the chunks.
     */
    private async embedChunks(chunks: Pick<Chunk, 'pageContent'>[]) {
        const texts = chunks.map(({ pageContent }) => pageContent);
        return this.embeddingModel.embedDocuments(texts);
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
     * The function `addLoader` asynchronously initalizes a loader using the provided parameters and adds
     * it to the system.
     * @param {LoaderParam} loaderParam - The `loaderParam` parameter is a string, object or instance of BaseLoader
     * that contains the necessary information to create a loader.
     * @param {boolean} forceReload - The `forceReload` parameter is a boolean used to indicate if a loader should be reloaded.
     * By default, loaders which have been previously run are not reloaded.
     * @returns The function `addLoader` returns an object with the following properties:
     * - `entriesAdded`: Number of new entries added during the loader operation
     * - `uniqueId`: Unique identifier of the loader
     * - `loaderType`: Name of the loader's constructor class
     */
    public async addLoader(loaderParam: BaseLoader, forceReload = false): Promise<AddLoaderReturn> {
        return this._addLoader(loaderParam, forceReload);
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
    private async _addLoader(loader: BaseLoader, forceReload: boolean): Promise<AddLoaderReturn> {
        const uniqueId = loader.getUniqueId();
        this.debug('Exploring loader', uniqueId);
        if (this.model) loader.injectModel(this.model);

        if (this.store && (await this.store.hasLoaderMetadata(uniqueId))) {
            if (forceReload) {
                const { chunksProcessed } = await this.store.getLoaderMetadata(uniqueId);

                this.debug(
                    `Loader previously run but forceReload set! Deleting previous ${chunksProcessed} keys...`,
                    uniqueId,
                );

                this.loaders = this.loaders.filter((x) => x.getUniqueId() != loader.getUniqueId());
                if (chunksProcessed > 0) await this.deleteLoader(uniqueId);
            } else {
                this.debug('Loader previously run. Skipping...', uniqueId);
                return { entriesAdded: 0, uniqueId, loaderType: loader.constructor.name };
            }
        }

        await loader.init();
        const chunks = await loader.getChunks();

        this.debug('Chunks generator received', uniqueId);
        const { newInserts } = await this.batchLoadChunks(uniqueId, chunks);
        this.debug(`Add loader completed with ${newInserts} new entries for`, uniqueId);

        if (loader.canIncrementallyLoad) {
            this.debug(`Registering incremental loader`, uniqueId);

            loader.on('incrementalChunkAvailable', async (incrementalGenerator) => {
                await this.incrementalLoader(uniqueId, incrementalGenerator);
            });
        }

        this.loaders.push(loader);
        this.debug(`Add loader ${uniqueId} wrap up done`);
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
        if (!this.store) return [];
        return this.store.getAllLoaderMetadata();
    }

    /**
     * The function `batchLoadChunks` processes chunks of data in batches and formats them for insertion.
     * @param {string} uniqueId - The `uniqueId` parameter is a string that represents a unique
     * identifier for loader being processed.
     * @param generator - The `incrementalGenerator` parameter in the `batchLoadChunks`
     * function is an asynchronous generator that yields `LoaderChunk` objects.
     * @returns The `batchLoadChunks` function returns an object with two properties:
     * 1. `newInserts`: The total number of new inserts made during the batch loading process.
     * 2. `formattedChunks`: An array containing the formatted chunks that were processed during the
     * batch loading process.
     */
    private async batchLoadChunks(uniqueId: string, generator: AsyncGenerator<LoaderChunk, void, void>) {
        let i = 0,
            batchSize = 0,
            newInserts = 0,
            formattedChunks: Chunk[] = [];

        for await (const chunk of generator) {
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

        this.debug(`Inserting chunks for loader ${loaderUniqueId} to vectorDatabase`);
        return this.vectorDatabase.insertChunks(embedChunks);
    }

    /**
     * The function `getEmbeddingsCount` returns the count of embeddings stored in a vector database
     * asynchronously.
     * @returns The `getEmbeddingsCount` method is returning the number of embeddings stored in the
     * vector database. It is an asynchronous function that returns a Promise with the count of
     * embeddings as a number.
     */
    public async getEmbeddingsCount(): Promise<number> {
        return this.vectorDatabase.getVectorCount();
    }

    /**
     * The function `deleteConversation` deletes all entries related to a particular conversation from the database
     * @param {string} conversationId - The `conversationId` that you want to delete. Pass 'default' to delete
     * the default conversation thread that is created and maintained automatically
     */
    public async deleteConversation(conversationId: string) {
        if (this.store) {
            await this.store.deleteConversation(conversationId);
        }
    }

    /**
     * The function `deleteLoader` deletes embeddings from a loader after confirming the action.
     * @param {string} uniqueLoaderId - The `uniqueLoaderId` parameter is a string that represents the
     * identifier of the loader that you want to delete.
     * @returns The `deleteLoader` method returns a boolean value indicating the success of the operation.
     */
    public async deleteLoader(uniqueLoaderId: string) {
        const deleteResult = await this.vectorDatabase.deleteKeys(uniqueLoaderId);
        if (this.store && deleteResult) await this.store.deleteLoaderMetadataAndCustomValues(uniqueLoaderId);
        this.loaders = this.loaders.filter((x) => x.getUniqueId() != uniqueLoaderId);
        return deleteResult;
    }

    /**
     * The function `reset` deletes all embeddings from the vector database if a
     * confirmation is provided.
     * @returns The `reset` function returns a boolean value indicating the result.
     */
    public async reset() {
        await this.vectorDatabase.reset();
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
        const queryEmbedded = await this.embeddingModel.embedQuery(cleanQuery);
        const unfilteredResultSet = await this.vectorDatabase.similaritySearch(
            queryEmbedded,
            this.searchResultCount + 10,
        );
        this.debug(`Query resulted in ${unfilteredResultSet.length} chunks before filteration...`);

        return unfilteredResultSet
            .filter((result) => result.score > this.embeddingRelevanceCutOff)
            .sort((a, b) => b.score - a.score)
            .slice(0, this.searchResultCount);
    }

    /**
     * The `search` function retrieves the unique embeddings for a given query without calling a LLM.
     * @param {string} query - The `query` parameter is a string that represents the input query that
     * needs to be processed.
     * @returns An array of unique page content items / chunks.
     */
    public async search(query: string) {
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
     * @param [options] - The `options` parameter in the `query` function is an optional object that
     * can have the following properties:
     * - conversationId - The `conversationId` parameter in the `query` method is an
     * optional parameter that represents the unique identifier for a conversation. It allows you to
     * track and associate the query with a specific conversation thread if needed. If provided, it can be
     * used to maintain context or history related to the conversation.
     * - customContext - You can pass in custom context from your own RAG stack. Passing.
     * your own context will disable the inbuilt RAG retrieval for that specific query
     * @returns The `query` method returns a Promise that resolves to an object with two properties:
     * `result` and `sources`. The `result` property is a string representing the result of querying
     * the LLM model with the provided query template, user query, context, and conversation history. The
     * `sources` property is an array of strings representing unique sources used to generate the LLM response.
     */
    public async query(
        userQuery: string,
        options?: { conversationId?: string; customContext?: Chunk[] },
    ): Promise<QueryResponse> {
        if (!this.model) {
            throw new Error('LLM Not set; query method not available');
        }

        let context = options?.customContext;
        if (!context) context = await this.search(userQuery);

        let conversationId = options?.conversationId;
        if (!conversationId && this.storeConversationsToDefaultThread) {
            conversationId = 'default';
        }

        const sources = [...new Set(context.map((chunk) => chunk.metadata.source))];
        this.debug(
            `Query resulted in ${context.length} chunks after filteration; chunks from ${sources.length} unique sources.`,
        );

        return this.model.query(this.systemMessage, userQuery, context, conversationId);
    }
}
