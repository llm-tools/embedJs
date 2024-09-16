import { VertexAIEmbeddings } from '@langchain/google-vertexai';
import { BaseEmbeddings } from '../interfaces/base-embeddings.js';

export class GeckoEmbeddings implements BaseEmbeddings {
    private model: VertexAIEmbeddings;

    constructor() {
        this.model = new VertexAIEmbeddings({ model: 'textembedding-gecko', maxConcurrency: 3, maxRetries: 5 });
    }

    async getDimensions(): Promise<number> {
        return 768;
    }

    async embedDocuments(texts: string[]): Promise<number[][]> {
        return this.model.embedDocuments(texts);
    }

    async embedQuery(text: string): Promise<number[]> {
        return this.model.embedQuery(text);
    }
}
