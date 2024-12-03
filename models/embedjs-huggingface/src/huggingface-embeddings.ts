import { HuggingFaceInferenceEmbeddings } from '@langchain/community/embeddings/hf';
import { BaseEmbeddings } from '@llm-tools/embedjs-interfaces';

export class HuggingFaceEmbeddings extends BaseEmbeddings {
    private model: HuggingFaceInferenceEmbeddings;
    private dimensions: number | null;

    constructor({ apiKey, model, dimensions }: { apiKey?: string; model?: string; dimensions?: number }) {
        super();

        this.dimensions = dimensions ?? null;
        this.model = new HuggingFaceInferenceEmbeddings({
            apiKey, //Or set process.env.HUGGINGFACEHUB_API_KEY
            model,
        });
    }

    override async getDimensions(): Promise<number> {
        if (this.dimensions === null) {
            this.dimensions = (await this.embedQuery('Test')).length;
        }

        return this.dimensions;
    }

    override async embedDocuments(texts: string[]): Promise<number[][]> {
        return this.model.embedDocuments(texts);
    }

    override async embedQuery(text: string): Promise<number[]> {
        return this.model.embedQuery(text);
    }
}
