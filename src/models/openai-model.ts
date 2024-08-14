import createDebugMessages from 'debug';
import { ChatOpenAI, ClientOptions } from '@langchain/openai';
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';

import { BaseModel } from '../interfaces/base-model.js';
import { Chunk, Message, ModelResponse } from '../global/types.js';

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

    override async runQuery(
        system: string,
        userQuery: string,
        supportingContext: Chunk[],
        pastConversations: Message[],
    ): Promise<ModelResponse> {
        const pastMessages: (AIMessage | SystemMessage | HumanMessage)[] = [new SystemMessage(system)];
        pastMessages.push(
            new SystemMessage(`Supporting context: ${supportingContext.map((s) => s.pageContent).join('; ')}`),
        );

        pastMessages.push.apply(
            pastMessages,
            pastConversations.map((c) => {
                if (c.actor === 'AI') return new AIMessage({ content: c.content });
                else if (c.actor === 'SYSTEM') return new SystemMessage({ content: c.content });
                else return new HumanMessage({ content: c.content });
            }),
        );
        pastMessages.push(new HumanMessage(`${userQuery}?`));

        this.debug('Executing openai model with prompt -', userQuery);
        const result = await this.model.invoke(pastMessages);
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
