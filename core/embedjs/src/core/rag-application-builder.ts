import { RAGApplication } from './rag-application.js';
import {
    BaseCache,
    BaseConversation,
    BaseDb,
    BaseEmbeddings,
    BaseLoader,
    BaseModel,
} from '@llm-tools/embedjs-interfaces';

export class RAGApplicationBuilder {
    private temperature: number;
    private queryTemplate: string;
    private cache?: BaseCache;
    private model: BaseModel | null;
    private searchResultCount: number;
    private embeddingModel: BaseEmbeddings;
    private embeddingRelevanceCutOff: number;
    private loaders: BaseLoader[];
    private vectorDb: BaseDb;
    private conversations: BaseConversation;

    constructor() {
        this.loaders = [];
        this.temperature = 0.1;
        this.searchResultCount = 7;

        this.queryTemplate = `You are a helpful human like chat bot. Use relevant provided context and chat history to answer the query at the end. Answer in full.
        If you don't know the answer, just say that you don't know, don't try to make up an answer.

        Do not use words like context or training data when responding. You can say you do not have all the information but do not indicate that you are not a reliable source.`;

        this.embeddingRelevanceCutOff = 0;
    }

    async build() {
        const entity = new RAGApplication(this);
        await entity.init();
        return entity;
    }

    addLoader(loader: BaseLoader) {
        this.loaders.push(loader);
        return this;
    }

    setSearchResultCount(searchResultCount: number) {
        this.searchResultCount = searchResultCount;
        return this;
    }

    setVectorDb(vectorDb: BaseDb) {
        this.vectorDb = vectorDb;
        return this;
    }

    setTemperature(temperature: number) {
        this.temperature = temperature;
        if (this.model) this.setModel(this.model);
        return this;
    }

    setEmbeddingRelevanceCutOff(embeddingRelevanceCutOff: number) {
        this.embeddingRelevanceCutOff = embeddingRelevanceCutOff;
        return this;
    }

    setQueryTemplate(queryTemplate: string) {
        // if (!queryTemplate.includes('{0}'))
        //     throw new Error('queryTemplate must include a placeholder for the query using {0}');

        this.queryTemplate = queryTemplate;
        return this;
    }

    setCache(cache: BaseCache) {
        this.cache = cache;
        return this;
    }

    setEmbeddingModel(embeddingModel: BaseEmbeddings) {
        this.embeddingModel = embeddingModel;
        return this;
    }

    setModel(model: 'NO_MODEL' | BaseModel) {
        if (typeof model === 'object') this.model = model;
        else this.model = null;
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

    getQueryTemplate() {
        return this.queryTemplate;
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

    setConversationEngine(conversations: BaseConversation) {
        this.conversations = conversations;
        return this;
    }

    getConversationsEngine() {
        return this.conversations;
    }
}
