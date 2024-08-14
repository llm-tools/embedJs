import { OllamaEmbeddings as OllamaEmbedding } from '@langchain/community/embeddings/ollama';
import { OllamaInput } from '@langchain/community/llms/ollama';

import { BaseEmbeddings } from '../interfaces/base-embeddings.js';

export class OllamaEmbeddings implements BaseEmbeddings {
    private model: OllamaEmbedding;

    constructor(options: {
        model: string;
        baseUrl: string;
        /** Defaults to "5m" */
        keepAlive?: string;
        headers?: Record<string, string>;
        requestOptions?: Omit<OllamaInput, 'baseUrl' | 'model' | 'format' | 'headers'>;
    }) {
        this.model = new OllamaEmbedding({
            model: options.model,
            baseUrl: options.baseUrl,
            keepAlive: options?.keepAlive,
            headers: options?.headers,
            requestOptions: options?.requestOptions,
        });
    }

    async getDimensions(): Promise<number> {
        const sample = await this.model.embedDocuments(['sample']);
        return sample[0].length;
    }

    async embedDocuments(texts: string[]): Promise<number[][]> {
        return this.model.embedDocuments(texts);
    }

    async embedQuery(text: string): Promise<number[]> {
        return this.model.embedQuery(text);
    }
}
