
import { OllamaEmbeddings } from '@langchain/community/embeddings/ollama';
import { BaseEmbeddings } from '../interfaces/base-embeddings.js';

export class OllamaEmbedding implements BaseEmbeddings {
    private model: OllamaEmbeddings;

    constructor(options?: { model?: string; baseUrl?: string; keepAlive: string; headers: Record<string, string>, requestOptions }) {
        this.model = new OllamaEmbeddings({
            model: options?.model,
            baseUrl: options?.baseUrl,
            keepAlive: options?.keepAlive,
            headers: options?.headers,
            requestOptions: options?.requestOptions,
        });
    }

    getDimensions(): number {
        // TODO: Some method to get embedding dimensions from this.model
        return 4096;
    }

    embedDocuments(texts: string[]): Promise<number[][]> {
        return this.model.embedDocuments(texts);
    }

    embedQuery(text: string): Promise<number[]> {
        return this.model.embedQuery(text);
    }
}
