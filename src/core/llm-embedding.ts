import { Document } from 'langchain/document';

import { Chunk } from '../global/types.js';
import { BaseEmbeddings } from '../interfaces/base-embeddings.js';

export class LLMEmbedding {
    private static singleton: LLMEmbedding;

    public static init(embeddingModel: BaseEmbeddings) {
        if (!this.singleton) {
            this.singleton = new LLMEmbedding(embeddingModel);
        }
    }

    public static getInstance() {
        return LLMEmbedding.singleton;
    }

    public static getEmbedding() {
        return LLMEmbedding.getInstance().embedding;
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
