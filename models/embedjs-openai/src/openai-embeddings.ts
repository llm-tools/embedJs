import { OpenAIEmbeddings } from '@langchain/openai';
import { BaseEmbeddings } from '@llm-tools/embedjs-interfaces';

export class OpenAiEmbeddings extends BaseEmbeddings {
    private model: OpenAIEmbeddings;

    constructor(private readonly configuration?: ConstructorParameters<typeof OpenAIEmbeddings>[0]) {
        super();
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

    override async getDimensions(): Promise<number> {
        return this.configuration.dimensions;
    }

    override async embedDocuments(texts: string[]): Promise<number[][]> {
        return this.model.embedDocuments(texts);
    }

    override async embedQuery(text: string): Promise<number[]> {
        return this.model.embedQuery(text);
    }
}
