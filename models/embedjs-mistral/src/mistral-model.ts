import createDebugMessages from 'debug';
import { ChatMistralAI } from '@langchain/mistralai';
import { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { BaseModel, ModelResponse } from '@llm-tools/embedjs-interfaces';

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

    override async runQuery(messages: (AIMessage | SystemMessage | HumanMessage)[]): Promise<ModelResponse> {
        this.debug('Executing mistral model with prompt -', messages[messages.length - 1].content);
        const result = await this.model.invoke(messages);
        this.debug('Mistral response -', result);

        return {
            result: result.content.toString(),
        };
    }
}
