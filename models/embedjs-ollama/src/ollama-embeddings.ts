import { OllamaEmbeddings as OllamaEmbedding, OllamaInput } from '@langchain/ollama';
import { BaseEmbeddings } from '@llm-tools/embedjs-interfaces';

export class OllamaEmbeddings extends BaseEmbeddings {
    private model: OllamaEmbedding;

    constructor(options: {
        model: string;
        baseUrl: string;
        /** Defaults to "5m" */
        keepAlive?: string;
        requestOptions?: Omit<OllamaInput, 'baseUrl' | 'model' | 'format' | 'headers'>;
    }) {
        super();

        this.model = new OllamaEmbedding({
            model: options.model,
            baseUrl: options.baseUrl,
            keepAlive: options?.keepAlive,
            requestOptions: options?.requestOptions,
        });
    }

    override async getDimensions(): Promise<number> {
        const sample = await this.model.embedDocuments(['sample']);
        return sample[0].length;
    }

    override async embedDocuments(texts: string[]): Promise<number[][]> {
        return this.model.embedDocuments(texts);
    }

    override async embedQuery(text: string): Promise<number[]> {
        return this.model.embedQuery(text);
    }
}
