import createDebugMessages from 'debug';
import { HuggingFaceInference } from '@langchain/community/llms/hf';

import { BaseModel } from '../interfaces/base-model.js';
import { Chunk, ConversationHistory } from '../global/types.js';

export class HuggingFace extends BaseModel {
    private readonly debug = createDebugMessages('embedjs:model:HuggingFace');

    private readonly modelName: string;
    private model: HuggingFaceInference;

    constructor({ temperature, modelName }: { temperature?: number; modelName?: string }) {
        super(temperature);
        this.modelName = modelName ?? 'meta-llama/Llama-2-7b-hf';
    }

    override async init(): Promise<void> {
        this.model = new HuggingFaceInference({
            model: this.modelName,
            temperature: this.temperature,
            maxTokens: 300,
            verbose: false,
        });
    }

    override async runQuery(
        system: string,
        userQuery: string,
        supportingContext: Chunk[],
        pastConversations: ConversationHistory[],
    ): Promise<string> {
        const pastMessages = [system];
        pastMessages.push(`Data: ${supportingContext.map((s) => s.pageContent).join('; ')}`);

        pastMessages.push.apply(
            pastConversations.map((c) => {
                if (c.sender === 'AI') return `AI: ${c.message}`;
                return `HUMAN: ${c.message}`;
            }),
        );

        pastMessages.push(`Question: ${userQuery}?`);
        pastMessages.push('Answer: ');

        const finalPrompt = pastMessages.join('\n');
        // this.debug('Final prompt being sent to HF - ', finalPrompt);
        this.debug(`Executing hugging face '${this.model.model}' model for prompt -`, userQuery);
        const result = await this.model.invoke(finalPrompt, {});
        return result;
    }
}
