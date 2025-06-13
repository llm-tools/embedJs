import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import createDebugMessages from 'debug';
import { v4 as uuidv4 } from 'uuid';

import { Chunk, QueryResponse, Message, SourceDetail, ModelResponse, Conversation } from '../types.js';
import { BaseStore } from './base-store.js';

export abstract class BaseModel {
    private readonly baseDebug = createDebugMessages('embedjs:model:BaseModel');

    private static store: BaseStore;
    private static defaultTemperature: number;

    public static setDefaultTemperature(temperature?: number) {
        BaseModel.defaultTemperature = temperature;
    }

    public static setStore(cache: BaseStore) {
        BaseModel.store = cache;
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
        messages.push(new HumanMessage(userQuery));
        return messages;
    }

    public async query(
        system: string,
        userQuery: string,
        supportingContext: Chunk[],
        conversationId?: string,
    ): Promise<QueryResponse> {
        let conversation: Conversation;

        if (conversationId) {
            if (!(await BaseModel.store.hasConversation(conversationId))) {
                this.baseDebug(`Conversation with id '${conversationId}' is new`);
                await BaseModel.store.addConversation(conversationId);
            }

            conversation = await BaseModel.store.getConversation(conversationId);
            this.baseDebug(
                `${conversation.entries.length} history entries found for conversationId '${conversationId}'`,
            );

            // Add user query to history
            await BaseModel.store.addEntryToConversation(conversationId, {
                id: uuidv4(),
                timestamp: new Date(),
                actor: 'HUMAN',
                content: userQuery,
            });
        } else {
            this.baseDebug('Conversation history is disabled as no conversationId was provided');
            conversation = { conversationId: 'default', entries: [] };
        }

        const messages = await this.prepare(system, userQuery, supportingContext, conversation.entries);
        const uniqueSources = this.extractUniqueSources(supportingContext);
        const timestamp = new Date();
        const id = uuidv4();

        // Run LLM implementation in subclass
        const response = await this.runQuery(messages);

        const newEntry: Message = {
            id,
            timestamp,
            content: response.result,
            actor: 'AI',
            sources: uniqueSources,
        };

        if (conversationId) {
            // Add AI response to history
            await BaseModel.store.addEntryToConversation(conversationId, newEntry);
        }

        return {
            ...newEntry,
            tokenUse: {
                inputTokens: response.tokenUse?.inputTokens ?? 'UNKNOWN',
                outputTokens: response.tokenUse?.outputTokens ?? 'UNKNOWN',
            },
        };
    }

    public async simpleQuery(messages: (AIMessage | SystemMessage | HumanMessage)[]) {
        const response = await this.runQuery(messages);

        return {
            result: response.result,
            tokenUse: {
                inputTokens: response.tokenUse?.inputTokens ?? 'UNKNOWN',
                outputTokens: response.tokenUse?.outputTokens ?? 'UNKNOWN',
            },
        };
    }

    protected abstract runQuery(messages: (AIMessage | SystemMessage | HumanMessage)[]): Promise<ModelResponse>;
}
