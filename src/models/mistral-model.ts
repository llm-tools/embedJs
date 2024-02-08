import createDebugMessages from 'debug';
import { ChatMistralAI } from '@langchain/mistralai';
import { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';

import { Chunk, ConversationHistory } from '../global/types.js';
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
        this.model = new ChatMistralAI({ apiKey: accessToken, modelName: modelName ?? 'mistral-medium' });
    }

    override async runQuery(
        system: string,
        userQuery: string,
        supportingContext: Chunk[],
        pastConversations: ConversationHistory[],
    ): Promise<string> {
        const pastMessages: (AIMessage | SystemMessage | HumanMessage)[] = [new SystemMessage(system)];
        pastMessages.push(
            new SystemMessage(`Supporting context: ${supportingContext.map((s) => s.pageContent).join('; ')}`),
        );

        pastMessages.push.apply(
            pastConversations.map((c) => {
                if (c.sender === 'AI')
                    return new AIMessage({
                        content: c.message,
                    });

                return new HumanMessage({
                    content: c.message,
                });
            }),
        );
        pastMessages.push(new HumanMessage(`${userQuery}?`));

        this.debug('Executing mistral model with prompt -', userQuery);
        const result = await this.model.invoke(pastMessages, {});
        return result.content.toString();
    }
}
