import createDebugMessages from 'debug';
import { AzureChatOpenAI } from '@langchain/openai';
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import { BaseModel, ModelResponse } from '@llm-tools/embedjs-interfaces';

export class AzureOpenAi extends BaseModel {
    private readonly debug = createDebugMessages('embedjs:model:OpenAi');
    private model: AzureChatOpenAI;

    constructor(private readonly configuration: ConstructorParameters<typeof AzureChatOpenAI>[0]) {
        super(configuration.temperature);
    }

    override async init(): Promise<void> {
        this.model = new AzureChatOpenAI(this.configuration);
    }

    override async runQuery(messages: (AIMessage | SystemMessage | HumanMessage)[]): Promise<ModelResponse> {
        this.debug('Executing Azure OpenAI model with prompt -', messages[messages.length - 1].content);
        const result = await this.model.invoke(messages);
        this.debug('Azure OpenAI response -', result);

        return {
            result: result.content.toString(),
            tokenUse: {
                inputTokens: result.response_metadata.tokenUsage.promptTokens,
                outputTokens: result.response_metadata.tokenUsage.completionTokens,
            },
        };
    }
}
