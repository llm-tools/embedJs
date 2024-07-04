import createDebugMessages from 'debug';
import { ChatAnthropic } from '@langchain/anthropic';
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';

import { BaseModel } from '../interfaces/base-model.js';
import { Chunk, Message } from '../global/types.js';

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

    override async runQuery(
        system: string,
        userQuery: string,
        supportingContext: Chunk[],
        pastConversations: Message[],
    ): Promise<string> {
        const pastMessages: (AIMessage | SystemMessage | HumanMessage)[] = [
            new SystemMessage(
                `${system}. Supporting context: ${supportingContext.map((s) => s.pageContent).join('; ')}`,
            ),
        ];

        pastMessages.push.apply(
            pastMessages,
            pastConversations.map((c) => {
                if (c.actor === 'AI') return new AIMessage({ content: c.content });
                else if (c.actor === 'SYSTEM') return new SystemMessage({ content: c.content });
                else return new HumanMessage({ content: c.content });
            }),
        );
        pastMessages.push(new HumanMessage(`${userQuery}?`));

        this.debug('Executing anthropic model with prompt -', userQuery);
        const result = await this.model.invoke(pastMessages);
        this.debug('Anthropic response -', result);
        return result.content.toString();
    }
}
