import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { Chunk } from '../global/types.js';
import { Document } from 'langchain/document';

export class LLMEmbedding {
    private static singleton: LLMEmbedding;

    public static getInstance() {
        if (!LLMEmbedding.singleton) {
            LLMEmbedding.singleton = new LLMEmbedding();
        }

        return LLMEmbedding.singleton;
    }

    private readonly embedding: OpenAIEmbeddings;

    private constructor() {
        this.embedding = new OpenAIEmbeddings({ maxConcurrency: 3, maxRetries: 5 });
    }

    public getEmbedding() {
        return this.embedding;
    }

    public translateChunks(chunks: Chunk[]) {
        return chunks.map((chunk) => {
            return <Document>{
                pageContent: chunk.pageContent,
                metadata: chunk.metadata,
            };
        });
    }
}
