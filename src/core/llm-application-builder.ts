import { BaseDb } from '../interfaces/base-db.js';
import { BaseLoader } from '../interfaces/base-loader.js';
import { LLMApplication } from './llm-application.js';

export class LLMApplicationBuilder {
    private similarityScore: number;
    private loaders: BaseLoader<any>[];
    private vectorDb: BaseDb;
    private temperature: number;
    private queryTemplate: string;

    constructor() {
        this.loaders = [];
        this.temperature = 0.9;
        this.similarityScore = 7;

        this.queryTemplate = `Use all the provided context to answer the query at the end. Answer in full.
        If you don't know the answer, just say that you don't know, don't try to make up an answer.
        Query: {0}`;
    }

    async build() {
        const entity = new LLMApplication(this);
        await entity.init();
        return entity;
    }

    addLoader(loader: BaseLoader<any>) {
        this.loaders.push(loader);
        return this;
    }

    setSimilarityScore(similarityScore: number) {
        this.similarityScore = similarityScore;
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

    getLoaders() {
        return this.loaders;
    }

    getSimilarityScore() {
        return this.similarityScore;
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
}
