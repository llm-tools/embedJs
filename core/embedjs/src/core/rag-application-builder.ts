import {
    BaseStore,
    BaseVectorDatabase,
    BaseEmbeddings,
    BaseLoader,
    BaseModel,
    SIMPLE_MODELS,
} from '@llm-tools/embedjs-interfaces';
import { MemoryStore } from '../store/memory-store.js';
import { RAGApplication } from './rag-application.js';

export class RAGApplicationBuilder {
    private temperature: number;
    private model: BaseModel | SIMPLE_MODELS | null;
    private vectorDatabase: BaseVectorDatabase;
    private loaders: BaseLoader[];
    private store: BaseStore;
    private systemMessage: string;
    private searchResultCount: number;
    private embeddingModel: BaseEmbeddings;
    private embeddingRelevanceCutOff: number;
    private storeConversationsToDefaultThread: boolean;

    constructor() {
        this.loaders = [];
        this.temperature = 0.1;
        this.searchResultCount = 30;
        this.model = SIMPLE_MODELS.OPENAI_GPT4_TURBO;

        this.systemMessage = `You are a helpful human like chat bot. Use relevant provided context and chat history to answer the query at the end. Answer in full.
        If you don't know the answer, just say that you don't know, don't try to make up an answer.

        Do not use words like context or training data when responding. You can say you do not have all the information but do not indicate that you are not a reliable source.`;

        this.storeConversationsToDefaultThread = true;
        this.embeddingRelevanceCutOff = 0;
        this.store = new MemoryStore();
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
     * The function setVectorDatabase sets a BaseVectorDatabase object
     * @param {BaseVectorDatabase} vectorDatabase - The `vectorDatabase` parameter is an instance of the `BaseVectorDatabase` class, which
     * is used to store vectors in a database.
     * @returns The `this` object is being returned, which allows for method chaining.
     */
    setVectorDatabase(vectorDatabase: BaseVectorDatabase) {
        this.vectorDatabase = vectorDatabase;
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

    setStore(store: BaseStore) {
        this.store = store;
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

    getVectorDatabase() {
        return this.vectorDatabase;
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

    getStore() {
        return this.store;
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
