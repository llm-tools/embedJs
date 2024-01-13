import createDebugMessages from 'debug';
import { HfInference } from '@huggingface/inference';

import { Chunk, ConversationHistory } from '../global/types.js';
import { BaseModel } from '../interfaces/base-model.js';

export class HuggingFace extends BaseModel {
    private readonly debug = createDebugMessages('embedjs:model:HuggingFace');

    private readonly modelName: string;
    private readonly runtime: HfInference;

    constructor(temperature: number, accessToken: string, modelName: string) {
        super(temperature);

        this.modelName = modelName;
        this.runtime = new HfInference(accessToken);
    }

    override async runQuery(
        prompt: string,
        _baseQuery: string,
        supportingContext: Chunk[],
        pastConversations: ConversationHistory[],
    ): Promise<string> {
        const pastAiMessages = pastConversations.filter((c) => c.sender === 'AI').map((c) => c.message);
        const pastUserMessages = pastConversations.filter((c) => c.sender === 'HUMAN').map((c) => c.message);

        const finalPrompt = `${prompt} \nSupporting context:\n${JSON.stringify(supportingContext.map((s) => s.pageContent).join(','))}`;
        this.debug('Executing with finalPrompt -', finalPrompt);

        const result = await this.runtime.conversational({
            model: this.modelName,
            inputs: {
                text: finalPrompt,
                generated_responses: pastAiMessages,
                past_user_inputs: pastUserMessages,
            },
            parameters: {
                temperature: this.temperature,
                
            },
        });

        this.debug('Warnings produced', result.warnings);
        return result.generated_text;
    }
}
