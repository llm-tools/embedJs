import createDebugMessages from 'debug';
import { ChatMistralAI } from '@langchain/mistralai';
import { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';

import { Chunk, Message } from '../global/types.js';
import { BaseModel } from '../interfaces/base-model.js';

export class Mistral extends BaseModel {
    private readonly debug = createDebugMessages('embedjs:model:Mistral');
    private model: ChatMistralAI;

    constructor({
        temperature,
        accessToken,
        modelName,
    }: {
        temperature?: number;
        accessToken: string;
        modelName?: string;
    }) {
        super(temperature);
        this.model = new ChatMistralAI({ apiKey: accessToken, model: modelName ?? 'mistral-medium' });
    }

    override async runQuery(
        system: string,
        userQuery: string,
        supportingContext: Chunk[],
        pastConversations: Message[],
    ): Promise<string> {
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

        this.debug('Executing mistral model with prompt -', userQuery);
        const result = await this.model.invoke(pastMessages);
        this.debug('Mistral response -', result);
        return result.content.toString();
    }
}
