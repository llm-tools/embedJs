import createDebugMessages from 'debug';
import { ChatVertexAI } from '@langchain/google-vertexai';
import { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { BaseModel, ModelResponse } from '@llm-tools/embedjs-interfaces';

export class VertexAI extends BaseModel {
    private readonly debug = createDebugMessages('embedjs:model:VertexAI');
    private model: ChatVertexAI;

    constructor({ temperature, modelName }: { temperature?: number; modelName?: string }) {
        super(temperature);
        this.model = new ChatVertexAI({ model: modelName ?? 'gemini-1.0-pro' });
    }

    override async runQuery(messages: (AIMessage | SystemMessage | HumanMessage)[]): Promise<ModelResponse> {
        this.debug('Executing VertexAI model with prompt -', messages[messages.length - 1].content);
        const result = await this.model.invoke(messages);
        this.debug('VertexAI response -', result);

        return {
            result: result.content.toString(),
        };
    }
}
