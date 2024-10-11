import createDebugMessages from 'debug';
import { ChatOpenAI, ClientOptions } from '@langchain/openai';
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import { BaseModel, ModelResponse } from '@llm-tools/embedjs-interfaces';

export class OpenAi extends BaseModel {
    private readonly debug = createDebugMessages('embedjs:model:OpenAi');
    private readonly configuration: ClientOptions;
    private readonly modelName: string;
    private model: ChatOpenAI;

    constructor({
        modelName,
        temperature,
        configuration,
    }: {
        modelName: string;
        temperature?: number;
        configuration?: ClientOptions;
    }) {
        super(temperature);
        this.modelName = modelName;
        this.configuration = configuration;
    }

    override async init(): Promise<void> {
        this.model = new ChatOpenAI({
            temperature: this.temperature,
            model: this.modelName,
            configuration: this.configuration,
        });
    }

    override async runQuery(messages: (AIMessage | SystemMessage | HumanMessage)[]): Promise<ModelResponse> {
        this.debug('Executing openai model with prompt -', messages[messages.length - 1].content);
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
