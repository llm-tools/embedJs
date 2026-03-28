import createDebugMessages from 'debug';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import { BaseModel, ModelResponse } from '@llm-tools/embedjs-interfaces';

export class MiniMax extends BaseModel {
    private readonly debug = createDebugMessages('embedjs:model:MiniMax');
    private model: ChatOpenAI;

    constructor({
        temperature,
        apiKey,
        modelName,
    }: {
        temperature?: number;
        apiKey?: string;
        modelName?: string;
    }) {
        // MiniMax temperature must be in (0.0, 1.0]; clamp to valid range
        const clampedTemp = temperature !== undefined ? Math.min(Math.max(temperature, 0.01), 1.0) : undefined;
        super(clampedTemp);

        this.model = new ChatOpenAI({
            apiKey: apiKey ?? process.env.MINIMAX_API_KEY,
            model: modelName ?? 'MiniMax-M2.7',
            temperature: clampedTemp,
            configuration: {
                baseURL: 'https://api.minimax.io/v1',
            },
        });
    }

    override async runQuery(messages: (AIMessage | SystemMessage | HumanMessage)[]): Promise<ModelResponse> {
        this.debug('Executing MiniMax model with prompt -', messages[messages.length - 1].content);
        const result = await this.model.invoke(messages);
        this.debug('MiniMax response -', result);

        // Strip <think>...</think> reasoning tags from MiniMax responses
        const raw = result.content.toString();
        const cleaned = raw.replace(/<think>[\s\S]*?<\/think>\s*/g, '').trim();

        return {
            result: cleaned,
            tokenUse: {
                inputTokens: (result.usage_metadata as Record<string, number>)?.input_tokens ?? 0,
                outputTokens: (result.usage_metadata as Record<string, number>)?.output_tokens ?? 0,
            },
        };
    }
}
