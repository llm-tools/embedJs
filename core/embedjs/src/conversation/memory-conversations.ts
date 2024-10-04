import { BaseConversation, Conversation, Message } from '@llm-tools/embedjs-interfaces';

export class InMemoryConversation implements BaseConversation {
    private conversations: Map<string, Conversation> = new Map();

    async init(): Promise<void> {
        this.conversations.clear();
    }

    async addConversation(conversationId: string): Promise<void> {
        if (!this.conversations.has(conversationId)) {
            this.conversations.set(conversationId, { conversationId, entries: [] });
        }
    }

    async getConversation(conversationId: string): Promise<Conversation> {
        if (!this.conversations.has(conversationId)) {
            // Automatically create a new conversation if it does not exist
            this.conversations.set(conversationId, { conversationId, entries: [] });
        }

        return this.conversations.get(conversationId)!;
    }

    async hasConversation(conversationId: string): Promise<boolean> {
        return this.conversations.has(conversationId);
    }

    async deleteConversation(conversationId: string): Promise<void> {
        this.conversations.delete(conversationId);
    }

    async addEntryToConversation(conversationId: string, entry: Message): Promise<void> {
        const conversation = await this.getConversation(conversationId);
        conversation.entries.push(entry);
    }

    async clearConversations(): Promise<void> {
        this.conversations.clear();
    }
}
