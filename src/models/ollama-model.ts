import createDebugMessages from 'debug';
import { Ollama as ChatOllamaAI } from '@langchain/community/llms/ollama';
import { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';

import { Chunk, ConversationHistory } from '../global/types.js';
import { BaseModel } from '../interfaces/base-model.js';

export class Ollama extends BaseModel {
    private readonly debug = createDebugMessages('embedjs:model:Ollama');
    private model: ChatOllamaAI;

    constructor({
        baseUrl,
        temperature,
        modelName
    }: {
        baseUrl?: string;
        temperature?: number;
        modelName?: string;
    }) {
        super(temperature);
        this.model = new ChatOllamaAI(
            { 
                model: modelName ?? 'llama2', 
                baseUrl: baseUrl ?? "http://localhost:11434" 
            }
        );
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

        this.debug(`Executing ollama model ${this.model} with prompt -`, userQuery);
        const result = await this.model.invoke(pastMessages);
        this.debug('Ollama response -', result);
        return result.toString();
    }
}
