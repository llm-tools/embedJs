import { OpenAI } from 'langchain/llms/openai';

import { BaseDb } from '../interfaces/base-db.js';
import { BaseLoader } from '../interfaces/base-loader.js';
import { LLMApplicationBuilder } from './llm-application-builder.js';
import { Chunk, EmbeddedChunk } from '../global/types.js';
import { LLMEmbedding } from './llm-embedding.js';
import { loadQAMapReduceChain } from 'langchain/chains';
import { cleanString, stringFormat } from '../global/utils.js';

export class LLMApplication {
    private readonly queryTemplate: string;
    private readonly similarityScore: number;
    private readonly loaders: BaseLoader<any>[];
    private readonly vectorDb: BaseDb;
    private readonly model: OpenAI;

    constructor(llmBuilder: LLMApplicationBuilder) {
        this.loaders = llmBuilder.getLoaders();
        this.vectorDb = llmBuilder.getVectorDb();
        this.queryTemplate = llmBuilder.getQueryTemplate();
        this.similarityScore = llmBuilder.getSimilarityScore();

        if (!this.vectorDb) throw new SyntaxError('VectorDb not set');
        this.model = new OpenAI({ temperature: llmBuilder.getTemperature() });
    }

    private async embedChunks(chunks: Chunk[]) {
        const texts = chunks.map(({ pageContent }) => pageContent);
        return LLMEmbedding.getInstance().getEmbedding().embedDocuments(texts);
    }

    private async getQueryEmbedding(query: string) {
        return LLMEmbedding.getInstance().getEmbedding().embedQuery(query);
    }

    private translateChunks(chunks: Chunk[]) {
        return LLMEmbedding.getInstance().translateChunks(chunks);
    }

    async init() {
        await this.vectorDb.init();

        for await (const loader of this.loaders) {
            await this.addLoader(loader);
        }
    }

    async addLoader(loader: BaseLoader<any>) {
        const chunks = await loader.getChunks();

        const embeddings = await this.embedChunks(chunks);
        const embedChunks = chunks.map((chunk, index) => {
            return <EmbeddedChunk>{
                pageContent: chunk.pageContent,
                vector: embeddings[index],
                metadata: chunk.metadata,
            };
        });

        await this.vectorDb.insertChunks(embedChunks);
    }

    async query(query: string): Promise<string> {
        const prompt = stringFormat(this.queryTemplate, query);
        const queryEmbedded = await this.getQueryEmbedding(cleanString(prompt));
        const contextChunks = await this.vectorDb.similaritySearch(queryEmbedded, this.similarityScore);
        const translatedChunks = this.translateChunks(contextChunks);

        const chain = loadQAMapReduceChain(this.model);
        const response = await chain.call({
            input_documents: translatedChunks,
            question: prompt,
        });

        return <string>response.text;
    }
}
