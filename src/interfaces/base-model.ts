import createDebugMessages from 'debug';
import { v4 as uuidv4 } from 'uuid';

import { BaseConversation } from './base-conversations.js';
import { Chunk, Message, ModelResponse, QueryResponse, SourceDetail } from '../global/types.js';

export abstract class BaseModel {
    private readonly baseDebug = createDebugMessages('embedjs:model:BaseModel');

    private static conversations: BaseConversation;
    private static defaultTemperature: number;

    public static setDefaultTemperature(temperature?: number) {
        BaseModel.defaultTemperature = temperature;
    }

    public static setConversations(conversations: BaseConversation) {
        BaseModel.conversations = conversations;
    }

    private readonly _temperature?: number;

    constructor(temperature?: number) {
        this._temperature = temperature;
    }

    public get temperature() {
        return this._temperature ?? BaseModel.defaultTemperature;
    }

    public async init(): Promise<void> {}

    public async query(
        system: string,
        userQuery: string,
        supportingContext: Chunk[],
        conversationId: string = 'default',
    ): Promise<QueryResponse> {
        const conversation = await BaseModel.conversations.getConversation(conversationId);
        this.baseDebug(`${conversation.entries.length} history entries found for conversationId '${conversationId}'`);

        // Add user query to history
        await BaseModel.conversations.addEntryToConversation(conversationId, {
            id: uuidv4(),
            timestamp: new Date(),
            actor: 'HUMAN',
            content: userQuery,
        });

        // Run LLM implementation in subclass
        const response = await this.runQuery(system, userQuery, supportingContext, conversation.entries.slice(0, -1));

        const uniqueSources = this.extractUniqueSources(supportingContext);
        const newEntry: Message = {
            id: uuidv4(),
            timestamp: new Date(),
            content: response.result,
            actor: 'AI',
            sources: uniqueSources,
        };

        // Add AI response to history
        await BaseModel.conversations.addEntryToConversation(conversationId, newEntry);
        return {
            ...newEntry,
            tokenUse: {
                inputTokens: response.tokenUse?.inputTokens ?? 'UNKNOWN',
                outputTokens: response.tokenUse?.outputTokens ?? 'UNKNOWN',
            },
        };
    }

    private extractUniqueSources(supportingContext: Chunk[]): SourceDetail[] {
        const uniqueSources = new Map<string, SourceDetail>(); // Use a Map to track unique sources by URL

        supportingContext.forEach((item) => {
            const { metadata } = item;
            if (metadata && metadata.source) {
                // Use the source URL as the key to ensure uniqueness
                if (!uniqueSources.has(metadata.source)) {
                    uniqueSources.set(metadata.source, {
                        source: metadata.source,
                        loaderId: metadata.uniqueLoaderId, // Assuming this field always exists
                    });
                }
            }
        });

        // Convert the values of the Map to an array
        return Array.from(uniqueSources.values());
    }

    protected abstract runQuery(
        system: string,
        userQuery: string,
        supportingContext: Chunk[],
        pastConversations: Message[],
    ): Promise<ModelResponse>;
}
