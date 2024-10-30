import { BaseCache, Conversation, Message } from '@llm-tools/embedjs-interfaces';

export class MemoryCache implements BaseCache {
    private loaderList: Record<string, { chunkCount: number }>;
    private loaderCustomValues: Record<string, Record<string, unknown>>;
    private conversations: Map<string, Conversation>;

    async init(): Promise<void> {
        this.loaderList = {};
        this.loaderCustomValues = {};
        this.conversations = new Map();
    }

    async addLoader(loaderId: string, chunkCount: number): Promise<void> {
        this.loaderList[loaderId] = { chunkCount };
    }

    async getLoader(loaderId: string): Promise<{ chunkCount: number }> {
        return this.loaderList[loaderId];
    }

    async hasLoader(loaderId: string): Promise<boolean> {
        return !!this.loaderList[loaderId];
    }

    async loaderCustomSet<T extends Record<string, unknown>>(loaderCombinedId: string, value: T): Promise<void> {
        this.loaderCustomValues[loaderCombinedId] = value;
    }

    async loaderCustomGet<T extends Record<string, unknown>>(loaderCombinedId: string): Promise<T> {
        return <T>this.loaderCustomValues[loaderCombinedId];
    }

    async loaderCustomHas(loaderCombinedId: string): Promise<boolean> {
        return !!this.loaderCustomValues[loaderCombinedId];
    }

    async deleteLoader(loaderId: string): Promise<void> {
        delete this.loaderList[loaderId];
    }

    async loaderCustomDelete(loaderCombinedId: string): Promise<void> {
        delete this.loaderList[loaderCombinedId];
    }

    async addConversation(conversationId: string): Promise<void> {
        if (!this.conversations.has(conversationId)) {
            this.conversations.set(conversationId, { conversationId, entries: [] });
        }
    }

    async getConversation(conversationId: string): Promise<Conversation> {
        return this.conversations.get(conversationId);
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
