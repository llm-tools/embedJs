import { CohereEmbeddings as LangChainCohereEmbeddings } from '@langchain/cohere';
import { BaseEmbeddings } from '@llm-tools/embedjs-interfaces';

export class CohereEmbeddings implements BaseEmbeddings {
    private model: LangChainCohereEmbeddings;

    constructor() {
        this.model = new LangChainCohereEmbeddings({
            model: 'embed-english-v2.0',
            maxConcurrency: 3,
            maxRetries: 5,
        });
    }

    async getDimensions(): Promise<number> {
        return 4096;
    }

    async embedDocuments(texts: string[]): Promise<number[][]> {
        return this.model.embedDocuments(texts);
    }

    async embedQuery(text: string): Promise<number[]> {
        return this.model.embedQuery(text);
    }
}
