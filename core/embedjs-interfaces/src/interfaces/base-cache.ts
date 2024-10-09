import { Conversation, Message } from '../types.js';

export interface BaseCache {
    init(): Promise<void>;
    addLoader(loaderId: string, chunkCount: number): Promise<void>;
    getLoader(loaderId: string): Promise<{ chunkCount: number }>;
    hasLoader(loaderId: string): Promise<boolean>;
    deleteLoader(loaderId: string): Promise<void>;

    loaderCustomSet<T extends Record<string, unknown>>(loaderCombinedId: string, value: T): Promise<void>;
    loaderCustomGet<T extends Record<string, unknown>>(loaderCombinedId: string): Promise<T>;
    loaderCustomHas(loaderCombinedId: string): Promise<boolean>;
    loaderCustomDelete(loaderCombinedId: string): Promise<void>;

    addConversation(conversationId: string): Promise<void>;
    getConversation(conversationId: string): Promise<Conversation>;
    hasConversation(conversationId: string): Promise<boolean>;
    deleteConversation(conversationId: string): Promise<void>;
    addEntryToConversation(conversationId: string, entry: Message): Promise<void>;
    clearConversations(): Promise<void>;
}
