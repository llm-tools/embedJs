import createDebugMessages from 'debug';
import { Chunk, ConversationHistory } from '../global/types.js';

export abstract class BaseModel {
    private readonly baseDebug = createDebugMessages('embedjs:model:BaseModel');

    protected readonly temperature: number;
    private readonly conversationMap: Map<string, ConversationHistory[]>;

    constructor(temperature: number) {
        this.temperature = temperature;
        this.conversationMap = new Map();
    }

    public async init(): Promise<void> {}

    public async query(
        prompt: string,
        baseQuery: string,
        supportingContext: Chunk[],
        conversationId: string = 'default',
    ): Promise<string> {
        if (!this.conversationMap.has(conversationId)) this.conversationMap.set(conversationId, []);

        const conversationHistory = this.conversationMap.get(conversationId);
        this.baseDebug(`${conversationHistory.length} history entries found for conversationId ${conversationId}`);
        const result = await this.runQuery(prompt, baseQuery, supportingContext, conversationHistory);

        conversationHistory.push({ message: baseQuery, sender: 'HUMAN' });
        conversationHistory.push({ message: result, sender: 'AI' });
        return result;
    }

    protected abstract runQuery(
        prompt: string,
        baseQuery: string,
        supportingContext: Chunk[],
        pastConversations: ConversationHistory[],
    ): Promise<string>;
}
