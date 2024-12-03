import { CohereEmbeddings as LangChainCohereEmbeddings } from '@langchain/cohere';
import { BaseEmbeddings } from '@llm-tools/embedjs-interfaces';

export class CohereEmbeddings extends BaseEmbeddings {
    private model: LangChainCohereEmbeddings;

    constructor() {
        super();

        this.model = new LangChainCohereEmbeddings({
            model: 'embed-english-v2.0',
            maxConcurrency: 3,
            maxRetries: 5,
        });
    }

    override async getDimensions(): Promise<number> {
        return 4096;
    }

    override async embedDocuments(texts: string[]): Promise<number[][]> {
        return this.model.embedDocuments(texts);
    }

    override async embedQuery(text: string): Promise<number[]> {
        return this.model.embedQuery(text);
    }
}
