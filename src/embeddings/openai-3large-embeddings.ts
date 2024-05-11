import { OpenAIEmbeddings } from '@langchain/openai';
import { BaseEmbeddings } from '../interfaces/base-embeddings.js';

export class OpenAi3LargeEmbeddings implements BaseEmbeddings {
    private model: OpenAIEmbeddings;
    private readonly dynamicDimension: number;

    constructor(params?: { dynamicDimension?: number }) {
        this.dynamicDimension = params?.dynamicDimension ?? 3072;

        this.model = new OpenAIEmbeddings({
            modelName: 'text-embedding-3-large',
            maxConcurrency: 3,
            maxRetries: 5,
            dimensions: this.dynamicDimension,
        });
    }

    getDimensions(): number {
        return this.dynamicDimension;
    }

    embedDocuments(texts: string[]): Promise<number[][]> {
        return this.model.embedDocuments(texts);
    }

    embedQuery(text: string): Promise<number[]> {
        return this.model.embedQuery(text);
    }
}
