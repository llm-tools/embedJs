import { Conversation, Message } from '../types.js';

export interface BaseConversation {
    init(): Promise<void>;
    addConversation(conversationId: string): Promise<void>;
    getConversation(conversationId: string): Promise<Conversation>;
    hasConversation(conversationId: string): Promise<boolean>;
    deleteConversation(conversationId: string): Promise<void>;
    addEntryToConversation(conversationId: string, entry: Message): Promise<void>;
    clearConversations(): Promise<void>;
}
