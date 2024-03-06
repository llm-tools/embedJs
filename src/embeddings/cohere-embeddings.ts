import { CohereEmbeddings as LangChainCohereEmbeddings } from '@langchain/cohere';

import { BaseEmbeddings } from '../interfaces/base-embeddings.js';

export class CohereEmbeddings implements BaseEmbeddings {
    private model: LangChainCohereEmbeddings;

    constructor() {
        this.model = new LangChainCohereEmbeddings({
            model: 'embed-english-v2.0',
            maxConcurrency: 3,
            maxRetries: 5,
        });
    }

    getDimensions(): number {
        return 4096;
    }

    embedDocuments(texts: string[]): Promise<number[][]> {
        return this.model.embedDocuments(texts);
    }

    embedQuery(text: string): Promise<number[]> {
        return this.model.embedQuery(text);
    }
}
