import createDebugMessages from 'debug';
import { ChatAnthropic } from '@langchain/anthropic';
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import { BaseModel, ModelResponse } from '@llm-tools/embedjs-interfaces';

export class Anthropic extends BaseModel {
    private readonly debug = createDebugMessages('embedjs:model:Anthropic');
    private readonly modelName: string;
    private model: ChatAnthropic;

    constructor(params?: { temperature?: number; modelName?: string }) {
        super(params?.temperature);
        this.modelName = params?.modelName ?? 'claude-3-sonnet-20240229';
    }

    override async init(): Promise<void> {
        this.model = new ChatAnthropic({ temperature: this.temperature, model: this.modelName });
    }

    override async runQuery(messages: (AIMessage | SystemMessage | HumanMessage)[]): Promise<ModelResponse> {
        this.debug('Executing anthropic model with prompt -', messages[messages.length - 1].content);
        const result = await this.model.invoke(messages);
        this.debug('Anthropic response -', result);

        return {
            result: result.content.toString(),
            tokenUse: {
                inputTokens: result.response_metadata.usage.input_tokens,
                outputTokens: result.response_metadata.usage.output_tokens,
            },
        };
    }
}
