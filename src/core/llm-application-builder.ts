import { BaseDb } from '../interfaces/base-db.js';
import { BaseLoader } from '../interfaces/base-loader.js';
import { LLMApplication } from './llm-application.js';

export class LLMApplicationBuilder {
    private similarityScore: number;
    private loaders: BaseLoader<any>[];
    private vectorDb: BaseDb;
    private temperature: number;

    constructor() {
        this.loaders = [];
        this.temperature = 0.9;
        this.similarityScore = 11;
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
}
