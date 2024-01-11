import { OpenAI } from '@langchain/openai';
import { BufferMemory } from 'langchain/memory';
import { ConversationChain } from 'langchain/chains';

import { Chunk } from '../global/types.js';
import { BaseModel } from '../interfaces/base-model.js';

export class OpenAiModel extends BaseModel {
    private readonly model: OpenAI;
    private executor: ConversationChain;

    constructor(temperature: number, modelName: string) {
        super(temperature);
        this.model = new OpenAI({ temperature, modelName });
    }

    async runQuery(prompt: string, supportingContext: Chunk[]): Promise<string> {
        if (this.executor === undefined) await this.resetContext();

        const result = await this.executor.call({
            input: `${prompt} \nSupporting documents:\n${JSON.stringify(supportingContext)}`,
        });

        return result.response;
    }

    async resetContext(): Promise<void> {
        const memory = new BufferMemory();
        this.executor = new ConversationChain({ llm: this.model, memory });
    }
}
