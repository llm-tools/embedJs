import { BaseDb } from '../interfaces/base-db.js';
import { BaseLoader } from '../interfaces/base-loader.js';
import { LLMApplication } from './llm-application.js';
import { BaseCache } from '../interfaces/base-cache.js';
import { BaseEmbeddings } from '../interfaces/base-embeddings.js';
import { AdaEmbeddings } from '../embeddings/ada-embeddings.js';

export class LLMApplicationBuilder {
    private searchResultCount: number;
    private loaders: BaseLoader[];
    private vectorDb: BaseDb;
    private temperature: number;
    private queryTemplate: string;
    private cache?: BaseCache;
    private embeddingModel: BaseEmbeddings;
    private initLoaders: boolean;
    private modelName: string;

    constructor() {
        this.loaders = [];
        this.temperature = 0.1;
        this.searchResultCount = 7;
        this.modelName = 'gpt-3.5-turbo';
        this.embeddingModel = new AdaEmbeddings();
        this.initLoaders = true;

        this.queryTemplate = `You are a helpful chat bot. Use all the provided context to answer the query at the end. Answer in full.
        If you don't know the answer, just say that you don't know, don't try to make up an answer.

        USER: {0}`;
    }

    async build() {
        const entity = new LLMApplication(this);
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
        return this;
    }

    setQueryTemplate(queryTemplate: string) {
        if (!queryTemplate.includes('{0}'))
            throw new Error('queryTemplate must include a placeholder for the query using {0}');

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

    setLoaderInit(shouldDo: boolean) {
        this.initLoaders = shouldDo;
        return this;
    }

    setModel(model: string) {
        this.modelName = model;
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

    getQueryTemplate() {
        return this.queryTemplate;
    }

    getCache() {
        return this.cache;
    }

    getEmbeddingModel() {
        return this.embeddingModel;
    }

    getLoaderInit() {
        return this.initLoaders;
    }

    getModel() {
        return this.modelName;
    }
}
