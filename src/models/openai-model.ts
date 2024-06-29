import createDebugMessages from 'debug';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';

import { BaseModel } from '../interfaces/base-model.js';
import { Chunk, ConversationHistory } from '../global/types.js';

export class OpenAi extends BaseModel {
    private readonly debug = createDebugMessages('embedjs:model:OpenAi');
    private readonly modelName: string;
    private readonly configuration: Object;
    private model: ChatOpenAI;

    constructor({ temperature, modelName, configuration }: { temperature?: number; modelName: string, configuration?: Object }) {
        super(temperature);
        this.modelName = modelName;
        this.configuration = configuration;
    }

    override async init(): Promise<void> {
        this.model = new ChatOpenAI({ temperature: this.temperature, model: this.modelName, configuration: this.configuration });
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
        return result.content.toString();
    }
}
