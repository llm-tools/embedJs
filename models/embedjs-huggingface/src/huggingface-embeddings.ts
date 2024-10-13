import { HuggingFaceInferenceEmbeddings } from '@langchain/community/embeddings/hf';
import { BaseEmbeddings } from '@llm-tools/embedjs-interfaces';

export class HuggingFaceEmbeddings implements BaseEmbeddings {
    private model: HuggingFaceInferenceEmbeddings;
    private dimensions: number | null;

    constructor({ apiKey, model, dimensions }: { apiKey?: string; model?: string; dimensions?: number }) {
        this.dimensions = dimensions ?? null;
        this.model = new HuggingFaceInferenceEmbeddings({
            apiKey, //Or set process.env.HUGGINGFACEHUB_API_KEY
            model,
        });
    }

    async getDimensions(): Promise<number> {
        if (this.dimensions === null) {
            this.dimensions = (await this.embedQuery('Test')).length;
        }

        return this.dimensions;
    }

    async embedDocuments(texts: string[]): Promise<number[][]> {
        return this.model.embedDocuments(texts);
    }

    async embedQuery(text: string): Promise<number[]> {
        return this.model.embedQuery(text);
    }
}
