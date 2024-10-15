import createDebugMessages from 'debug';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import { BaseModel, ModelResponse } from '@llm-tools/embedjs-interfaces';

export class OpenAi extends BaseModel {
    private readonly debug = createDebugMessages('embedjs:model:OpenAi');
    private model: ChatOpenAI;

    constructor(private readonly configuration: ConstructorParameters<typeof ChatOpenAI>[0]) {
        super(configuration.temperature);
    }

    override async init(): Promise<void> {
        this.model = new ChatOpenAI(this.configuration);
    }

    override async runQuery(messages: (AIMessage | SystemMessage | HumanMessage)[]): Promise<ModelResponse> {
        this.debug('Executing OpenAI model with prompt -', messages[messages.length - 1].content);
        const result = await this.model.invoke(messages);
        this.debug('OpenAI response -', result);

        return {
            result: result.content.toString(),
            tokenUse: {
                inputTokens: result.response_metadata.tokenUsage.promptTokens,
                outputTokens: result.response_metadata.tokenUsage.completionTokens,
            },
        };
    }
}
