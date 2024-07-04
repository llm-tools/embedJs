import { ClientOptions, OpenAIEmbeddings } from '@langchain/openai';
import { BaseEmbeddings } from '../interfaces/base-embeddings.js';

export class OpenAi3SmallEmbeddings implements BaseEmbeddings {
    private model: OpenAIEmbeddings;

    constructor(options?: { configuration?: ClientOptions; maxConcurrency: number; maxRetries: number }) {
        this.model = new OpenAIEmbeddings({
            modelName: 'text-embedding-3-small',
            configuration: options?.configuration,
            maxConcurrency: options?.maxConcurrency ?? 3,
            maxRetries: options?.maxRetries ?? 5,
        });
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
