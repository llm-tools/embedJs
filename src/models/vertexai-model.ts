import createDebugMessages from 'debug';
import { ChatVertexAI } from '@langchain/google-vertexai';
import { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';

import { Chunk, EntryMessage } from '../global/types.js';
import { BaseModel } from '../interfaces/base-model.js';

export class VertexAI extends BaseModel {
    private readonly debug = createDebugMessages('embedjs:model:VertexAI');
    private model: ChatVertexAI;

    constructor({ temperature, modelName }: { temperature?: number; modelName?: string }) {
        super(temperature);
        this.model = new ChatVertexAI({ model: modelName ?? 'gemini-1.0-pro' });
    }

    override async runQuery(
        system: string,
        userQuery: string,
        supportingContext: Chunk[],
        pastConversations: EntryMessage[],
    ): Promise<string> {
        const systemString =
            system + '\n' + `Supporting context: ${supportingContext.map((s) => s.pageContent).join('; ')}`;
        const pastMessages: (AIMessage | SystemMessage | HumanMessage)[] = [new SystemMessage(systemString)];

        pastMessages.push.apply(
            pastMessages,
            pastConversations.map((c) => {
                if (c.sender === 'AI') return new AIMessage({ content: c.message });
                else if (c.sender === 'SYSTEM') return new SystemMessage({ content: c.message });
                else return new HumanMessage({ content: c.message });
            }),
        );
        pastMessages.push(new HumanMessage(`${userQuery}?`));

        this.debug('Executing VertexAI model with prompt -', userQuery);
        const result = await this.model.invoke(pastMessages);
        this.debug('VertexAI response -', result);
        return result.content.toString();
    }
}
