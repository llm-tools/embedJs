import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { BaseEmbeddings } from '../interfaces/base-embeddings.js';

export class AdaEmbeddings implements BaseEmbeddings {
    private model: OpenAIEmbeddings;

    constructor() {
        this.model = new OpenAIEmbeddings({ maxConcurrency: 3, maxRetries: 5 });
    }

    getDimensions(): number {
        return 1536;
    }

    embedDocuments(texts: string[]): Promise<number[][]> {
        return this.model.embedDocuments(texts);
    }

    embedQuery(text: string): Promise<number[]> {
        return this.model.embedQuery(text);
    }
}
