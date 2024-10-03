import { ClientOptions, OpenAIEmbeddings } from '@langchain/openai';
import { BaseEmbeddings } from '@llm-tools/embedjs-interfaces';

export class OpenAi3LargeEmbeddings implements BaseEmbeddings {
    private model: OpenAIEmbeddings;
    private readonly dynamicDimension: number;

    constructor(options?: {
        configuration?: ClientOptions;
        dynamicDimension?: number;
        maxConcurrency: number;
        maxRetries: number;
    }) {
        this.dynamicDimension = options?.dynamicDimension ?? 3072;

        this.model = new OpenAIEmbeddings({
            modelName: 'text-embedding-3-large',
            configuration: options?.configuration,
            maxConcurrency: options?.maxConcurrency ?? 3,
            maxRetries: options?.maxRetries ?? 5,
        });
    }

    async getDimensions(): Promise<number> {
        return this.dynamicDimension;
    }

    async embedDocuments(texts: string[]): Promise<number[][]> {
        return this.model.embedDocuments(texts);
    }

    async embedQuery(text: string): Promise<number[]> {
        return this.model.embedQuery(text);
    }
}
