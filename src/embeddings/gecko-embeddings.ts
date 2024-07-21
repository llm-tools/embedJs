import { GoogleVertexAIEmbeddings } from '@langchain/community/embeddings/googlevertexai';
import { BaseEmbeddings } from '../interfaces/base-embeddings.js';

export class GeckoEmbeddings implements BaseEmbeddings {
    private model: GoogleVertexAIEmbeddings;

    constructor() {
        this.model = new GoogleVertexAIEmbeddings({ model: 'textembedding-gecko', maxConcurrency: 3, maxRetries: 5 });
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
