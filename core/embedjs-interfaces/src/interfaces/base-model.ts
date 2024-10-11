import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import createDebugMessages from 'debug';
import { v4 as uuidv4 } from 'uuid';

import {
    Chunk,
    QueryResponse,
    Message,
    SourceDetail,
    ModelResponse,
    ModelStreamResponse,
    QueryStreamResponse,
} from '../types.js';
import { BaseCache } from './base-cache.js';

export abstract class BaseModel {
    private readonly baseDebug = createDebugMessages('embedjs:model:BaseModel');

    private static cache: BaseCache;
    private static defaultTemperature: number;

    public static setDefaultTemperature(temperature?: number) {
        BaseModel.defaultTemperature = temperature;
    }

    public static setCache(cache: BaseCache) {
        BaseModel.cache = cache;
    }

    private readonly _temperature?: number;

    constructor(temperature?: number) {
        this._temperature = temperature;
    }

    public get temperature() {
        return this._temperature ?? BaseModel.defaultTemperature;
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    public async init(): Promise<void> {}

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

    public async prepare(
        system: string,
        userQuery: string,
        supportingContext: Chunk[],
        pastConversations: Message[],
    ): Promise<(AIMessage | SystemMessage | HumanMessage)[]> {
        const messages: (AIMessage | SystemMessage | HumanMessage)[] = [new SystemMessage(system)];
        messages.push(
            new SystemMessage(`Supporting context: ${supportingContext.map((s) => s.pageContent).join('; ')}`),
        );

        messages.push(
            ...pastConversations.map((c) => {
                if (c.actor === 'AI') return new AIMessage({ content: c.content });
                else if (c.actor === 'SYSTEM') return new SystemMessage({ content: c.content });
                else return new HumanMessage({ content: c.content });
            }),
        );
        messages.push(new HumanMessage(`${userQuery}?`));
        return messages;
    }

    public async query(
        system: string,
        userQuery: string,
        supportingContext: Chunk[],
        conversationId: string,
        stream: false,
    ): Promise<QueryResponse>;
    public async query(
        system: string,
        userQuery: string,
        supportingContext: Chunk[],
        conversationId: string,
        stream: true,
    ): Promise<QueryStreamResponse>;
    public async query(
        system: string,
        userQuery: string,
        supportingContext: Chunk[],
        conversationId = 'default',
        stream = false,
    ): Promise<QueryResponse | QueryStreamResponse> {
        const conversation = await BaseModel.cache.getConversation(conversationId);
        this.baseDebug(`${conversation.entries.length} history entries found for conversationId '${conversationId}'`);

        // Add user query to history
        await BaseModel.cache.addEntryToConversation(conversationId, {
            id: uuidv4(),
            timestamp: new Date(),
            actor: 'HUMAN',
            content: userQuery,
        });

        const messages = await this.prepare(system, userQuery, supportingContext, conversation.entries.slice(0, -1));
        const uniqueSources = this.extractUniqueSources(supportingContext);
        const timestamp = new Date();
        const id = uuidv4();

        if (stream) {
            // Run LLM implementation in subclass
            const response = await this.runStreamingQuery(messages);
            return {
                id,
                timestamp,
                result: response.result,
                sources: uniqueSources,
            };
        } else {
            // Run LLM implementation in subclass
            const response = await this.runQuery(messages);

            const newEntry: Message = {
                id,
                timestamp,
                content: response.result,
                actor: 'AI',
                sources: uniqueSources,
            };

            // Add AI response to history
            await BaseModel.cache.addEntryToConversation(conversationId, newEntry);
            return {
                ...newEntry,
                tokenUse: {
                    inputTokens: response.tokenUse?.inputTokens ?? 'UNKNOWN',
                    outputTokens: response.tokenUse?.outputTokens ?? 'UNKNOWN',
                },
            };
        }
    }

    protected abstract runQuery(messages: (AIMessage | SystemMessage | HumanMessage)[]): Promise<ModelResponse>;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected runStreamingQuery(_messages: (AIMessage | SystemMessage | HumanMessage)[]): Promise<ModelStreamResponse> {
        throw new Error('Streaming not supported by this model');
    }
}
