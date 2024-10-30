import { BaseCache, BaseDb, BaseEmbeddings, BaseLoader, BaseModel, SIMPLE_MODELS } from '@llm-tools/embedjs-interfaces';
import { MemoryCache } from '../cache/memory-cache.js';
import { RAGApplication } from './rag-application.js';

export class RAGApplicationBuilder {
    private temperature: number;
    private model: BaseModel | SIMPLE_MODELS | null;
    private loaders: BaseLoader[];
    private vectorDb: BaseDb;
    private cache: BaseCache;
    private systemMessage: string;
    private searchResultCount: number;
    private embeddingModel: BaseEmbeddings;
    private embeddingRelevanceCutOff: number;
    private storeConversationsToDefaultThread: boolean;

    constructor() {
        this.loaders = [];
        this.temperature = 0.1;
        this.searchResultCount = 7;
        this.model = SIMPLE_MODELS.OPENAI_GPT4_TURBO;

        this.systemMessage = `You are a helpful human like chat bot. Use relevant provided context and chat history to answer the query at the end. Answer in full.
        If you don't know the answer, just say that you don't know, don't try to make up an answer.

        Do not use words like context or training data when responding. You can say you do not have all the information but do not indicate that you are not a reliable source.`;

        this.storeConversationsToDefaultThread = true;
        this.embeddingRelevanceCutOff = 0;
        this.cache = new MemoryCache();
    }

    /**
     * The `build` function creates a new `RAGApplication` entity and initializes it asynchronously based on provided parameters.
     * @returns An instance of the `RAGApplication` class after it has been initialized asynchronously.
     */
    async build() {
        const entity = new RAGApplication(this);
        await entity.init(this);
        return entity;
    }

    /**
     * The function setVectorDb sets a BaseDb object
     * @param {BaseDb} vectorDb - The `vectorDb` parameter is an instance of the `BaseDb` class, which
     * is used to store vectors in a database.
     * @returns The `this` object is being returned, which allows for method chaining.
     */
    setVectorDb(vectorDb: BaseDb) {
        this.vectorDb = vectorDb;
        return this;
    }

    setEmbeddingModel(embeddingModel: BaseEmbeddings) {
        this.embeddingModel = embeddingModel;
        return this;
    }

    setModel(model: 'NO_MODEL' | SIMPLE_MODELS | BaseModel) {
        if (typeof model === 'object') this.model = model;
        else {
            if (model === 'NO_MODEL') this.model = null;
            else this.model = model;
        }

        return this;
    }

    setCache(cache: BaseCache) {
        this.cache = cache;
        return this;
    }

    setTemperature(temperature: number) {
        this.temperature = temperature;
        if (this.model) this.setModel(this.model);
        return this;
    }

    setSystemMessage(systemMessage: string) {
        this.systemMessage = systemMessage;
        return this;
    }

    setEmbeddingRelevanceCutOff(embeddingRelevanceCutOff: number) {
        this.embeddingRelevanceCutOff = embeddingRelevanceCutOff;
        return this;
    }

    addLoader(loader: BaseLoader) {
        this.loaders.push(loader);
        return this;
    }

    /**
     * The setSearchResultCount function sets the search result count
     * @param {number} searchResultCount - The `searchResultCount` parameter
     * represents the count of search results picked up from the vector store per query.
     * @returns The `this` object is being returned, which allows for method chaining.
     */
    setSearchResultCount(searchResultCount: number) {
        this.searchResultCount = searchResultCount;
        return this;
    }

    /**
     * The setParamStoreConversationsToDefaultThread configures whether the conversation hisotry for queries made
     * without a conversationId passed should be stored in the default thread. This is set to True by default.
     */
    setParamStoreConversationsToDefaultThread(storeConversationsToDefaultThread: boolean) {
        this.storeConversationsToDefaultThread = storeConversationsToDefaultThread;
        return this;
    }

    getLoaders() {
        return this.loaders;
    }

    getSearchResultCount() {
        return this.searchResultCount;
    }

    getVectorDb() {
        return this.vectorDb;
    }

    getTemperature() {
        return this.temperature;
    }

    getEmbeddingRelevanceCutOff() {
        return this.embeddingRelevanceCutOff;
    }

    getSystemMessage() {
        return this.systemMessage;
    }

    getCache() {
        return this.cache;
    }

    getEmbeddingModel() {
        return this.embeddingModel;
    }

    getModel() {
        return this.model;
    }

    getParamStoreConversationsToDefaultThread() {
        return this.storeConversationsToDefaultThread;
    }
}
