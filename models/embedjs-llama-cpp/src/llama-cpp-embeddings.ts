import { BaseEmbeddings } from '@llm-tools/embedjs-interfaces';
import { getLlama, Llama, LlamaEmbedding, LlamaEmbeddingContext, LlamaModel } from 'node-llama-cpp';

export class LlamaCppEmbeddings implements BaseEmbeddings {
    private context: LlamaEmbeddingContext;

    constructor(options: { modelPath: string; }) {
        getLlama().then((llama: Llama) => {
            llama.loadModel({ modelPath: options.modelPath }).then((model: LlamaModel) => {
                model.createEmbeddingContext().then((context: LlamaEmbeddingContext) => {
                    this.context = context;
                });
            });
        });
    }
    async getDimensions(): Promise<number> {
        const sample = await this.embedDocuments(['sample']);
        return sample[0].length;
    }

    async embedDocuments(texts: string[]): Promise<number[][]> {
        const embeddings = new Map<string, LlamaEmbedding>();
        await Promise.all(texts.map(async (document) => {
            const embedding = await this.context.getEmbeddingFor(document);
            embeddings.set(document, embedding);
        }));
        return Array.from(embeddings).map(([_, embedding]) => embedding.vector as number[]);
    }

    async embedQuery(text: string): Promise<number[]> {
        return (await this.context.getEmbeddingFor(text)).vector as number[];
    }
}
