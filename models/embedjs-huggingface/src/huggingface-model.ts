import createDebugMessages from 'debug';
import { HuggingFaceInference } from '@langchain/community/llms/hf';
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import { BaseModel, ModelResponse } from '@llm-tools/embedjs-interfaces';

export class HuggingFace extends BaseModel {
    private readonly debug = createDebugMessages('embedjs:model:HuggingFace');

    private readonly modelName: string;
    private readonly maxNewTokens: number;
    private readonly endpointUrl?: string;
    private model: HuggingFaceInference;

    constructor(params?: { modelName?: string; temperature?: number; maxNewTokens?: number; endpointUrl?: string }) {
        super(params?.temperature);

        this.endpointUrl = params?.endpointUrl;
        this.maxNewTokens = params?.maxNewTokens ?? 300;
        this.modelName = params?.modelName ?? 'mistralai/Mixtral-8x7B-Instruct-v0.1';
    }

    override async init(): Promise<void> {
        this.model = new HuggingFaceInference({
            model: this.modelName,
            maxTokens: this.maxNewTokens,
            temperature: this.temperature,
            endpointUrl: this.endpointUrl,
            verbose: false,
            maxRetries: 1,
        });
    }

    override async runQuery(messages: (AIMessage | SystemMessage | HumanMessage)[]): Promise<ModelResponse> {
        this.debug(
            `Executing hugging face '${this.model.model}' model with prompt -`,
            messages[messages.length - 1].content,
        );

        const finalPrompt = messages.reduce((previous, entry) => {
            return `${previous}\n${entry.content}`;
        }, '');
        // this.debug('Final prompt being sent to HF - ', finalPrompt);
        const result = await this.model.invoke(finalPrompt);
        this.debug('Hugging response -', result);

        return {
            result,
        };
    }
}
