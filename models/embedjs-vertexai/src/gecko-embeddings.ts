import { VertexAIEmbeddings } from '@langchain/google-vertexai';
import { BaseEmbeddings } from '@llm-tools/embedjs-interfaces';

export class GeckoEmbeddings extends BaseEmbeddings {
    private model: VertexAIEmbeddings;

    constructor() {
        super();
        this.model = new VertexAIEmbeddings({ model: 'textembedding-gecko', maxConcurrency: 3, maxRetries: 5 });
    }

    override async getDimensions(): Promise<number> {
        return 768;
    }

    override async embedDocuments(texts: string[]): Promise<number[][]> {
        return this.model.embedDocuments(texts);
    }

    override async embedQuery(text: string): Promise<number[]> {
        return this.model.embedQuery(text);
    }
}
