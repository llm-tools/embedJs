import createDebugMessages from 'debug';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';

import { BaseModel } from '../interfaces/base-model.js';
import { Chunk, ConversationHistory } from '../global/types.js';

export class OpenAi extends BaseModel {
    private readonly debug = createDebugMessages('embedjs:model:BaseModel');
    private readonly model: ChatOpenAI;

    constructor(temperature: number, modelName: string) {
        super(temperature);
        this.model = new ChatOpenAI({ temperature, modelName });
    }

    override async runQuery(
        prompt: string,
        _baseQuery: string,
        supportingContext: Chunk[],
        pastConversations: ConversationHistory[],
    ): Promise<string> {
        const pastMessages = pastConversations.map((c) => {
            if (c.sender === 'AI')
                return new AIMessage({
                    content: c.message,
                });

            return new HumanMessage({
                content: c.message,
            });
        });

        const finalPrompt = `${prompt} \nSupporting context:\n${JSON.stringify(supportingContext.map((s) => s.pageContent).join(','))}`;
        this.debug('Executing with finalPrompt -', finalPrompt);
        pastMessages.push(new SystemMessage(finalPrompt));

        const result = await this.model.invoke(pastMessages);
        return result.content.toString();
    }
}
