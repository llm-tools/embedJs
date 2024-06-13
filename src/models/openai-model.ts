import createDebugMessages from 'debug';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';

import { BaseModel } from '../interfaces/base-model.js';
import { Chunk, ConversationHistory, ModelResponse } from '../global/types.js';

export class OpenAi extends BaseModel {
    private readonly debug = createDebugMessages('ragkit:model:OpenAi');
    private readonly modelName: string;
    private model: ChatOpenAI;

    constructor({ temperature, modelName }: { temperature?: number; modelName: string }) {
        super(temperature);
        this.modelName = modelName;
    }

    override async init(): Promise<void> {
        this.model = new ChatOpenAI({ temperature: this.temperature, model: this.modelName });
    }

    override async runQuery(
        system: string,
        userQuery: string,
        supportingContext: Chunk[],
        pastConversations: ConversationHistory[],
    ): Promise<ModelResponse> {
        const pastMessages: (AIMessage | SystemMessage | HumanMessage)[] = [new SystemMessage(system)];
        pastMessages.push(
            new SystemMessage(`Supporting context: ${supportingContext.map((s) => s.pageContent).join('; ')}`),
        );

        pastMessages.push.apply(
            pastMessages,
            pastConversations.map((c) => {
                if (c.sender === 'AI') return new AIMessage({ content: c.message });
                else if (c.sender === 'SYSTEM') return new SystemMessage({ content: c.message });
                else return new HumanMessage({ content: c.message });
            }),
        );
        pastMessages.push(new HumanMessage(`${userQuery}?`));

        this.debug('Executing openai model with prompt -', userQuery);
        const result = await this.model.invoke(pastMessages);
        this.debug('OpenAI response -', result);

        return {
            llmResponse: result.content.toString(),
            tokenUsage: {
                promptTokens: result.response_metadata.tokenUsage.promptTokens,
                completionTokens: result.response_metadata.tokenUsage.completionTokens,
            },
        };
    }
}
