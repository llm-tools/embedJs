import createDebugMessages from 'debug';
import { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { BaseModel, ModelResponse } from '@llm-tools/embedjs-interfaces';
import { LlamaCpp as ChatLlamaCpp } from '@langchain/community/llms/llama_cpp';

export class LlamaCpp extends BaseModel {
    private readonly debug = createDebugMessages('embedjs:model:LlamaCpp');
    private model: ChatLlamaCpp;

    constructor({ temperature, modelPath }: { temperature?: number; modelPath: string }) {
        super(temperature);
        this.model = new ChatLlamaCpp({
            modelPath: modelPath ?? '',
        });
    }

    override async runQuery(messages: (AIMessage | SystemMessage | HumanMessage)[]): Promise<ModelResponse> {
        this.debug(`Executing LlamaCpp model ${this.model} with prompt -`, messages[messages.length - 1].content);
        const result = await this.model.invoke(messages);
        this.debug('LlamaCpp response -', result);

        return {
            result: result.toString(),
        };
    }
}
