import { OllamaEmbeddings as OllamaEmbedding, OllamaInput } from '@langchain/ollama';
import { BaseEmbeddings } from '@llm-tools/embedjs-interfaces';

export class OllamaEmbeddings implements BaseEmbeddings {
    private model: OllamaEmbedding;

    constructor(options: {
        model: string;
        baseUrl: string;
        /** Defaults to "5m" */
        keepAlive?: string;
        requestOptions?: Omit<OllamaInput, 'baseUrl' | 'model' | 'format' | 'headers'>;
    }) {
        this.model = new OllamaEmbedding({
            model: options.model,
            baseUrl: options.baseUrl,
            keepAlive: options?.keepAlive,
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
