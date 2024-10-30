import { OpenAIEmbeddings } from '@langchain/openai';
import { BaseEmbeddings } from '@llm-tools/embedjs-interfaces';

export class OpenAiEmbeddings implements BaseEmbeddings {
    private model: OpenAIEmbeddings;

    constructor(private readonly configuration?: ConstructorParameters<typeof OpenAIEmbeddings>[0]) {
        if (!this.configuration) this.configuration = {};
        if (!this.configuration.model) this.configuration.model = 'text-embedding-3-small';

        if (!this.configuration.dimensions) {
            if (this.configuration.model === 'text-embedding-3-small') {
                this.configuration.dimensions = 1536;
            } else if (this.configuration.model === 'text-embedding-3-large') {
                this.configuration.dimensions = 3072;
            } else if (this.configuration.model === 'text-embedding-ada-002') {
                this.configuration.dimensions = 1536;
            } else {
                throw new Error('You need to pass in the optional dimensions parameter for this model');
            }
        }

        this.model = new OpenAIEmbeddings(this.configuration);
    }

    async getDimensions(): Promise<number> {
        return this.configuration.dimensions;
    }

    async embedDocuments(texts: string[]): Promise<number[][]> {
        return this.model.embedDocuments(texts);
    }

    async embedQuery(text: string): Promise<number[]> {
        return this.model.embedQuery(text);
    }
}
