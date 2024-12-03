import { BaseEmbeddings, Chunk } from '@llm-tools/embedjs-interfaces';
import { Document } from 'langchain/document';

export class RAGEmbedding {
    private static singleton: RAGEmbedding;

    public static async init(embeddingModel: BaseEmbeddings) {
        if (!this.singleton) {
            await embeddingModel.init();
            this.singleton = new RAGEmbedding(embeddingModel);
        }
    }

    public static getInstance() {
        return RAGEmbedding.singleton;
    }

    public static getEmbedding() {
        return RAGEmbedding.getInstance().embedding;
    }

    public static translateChunks(chunks: Chunk[]) {
        return chunks.map((chunk) => {
            return <Document>{
                pageContent: chunk.pageContent,
                metadata: chunk.metadata,
            };
        });
    }

    private readonly embedding: BaseEmbeddings;

    private constructor(embeddingModel: BaseEmbeddings) {
        this.embedding = embeddingModel;
    }
}
