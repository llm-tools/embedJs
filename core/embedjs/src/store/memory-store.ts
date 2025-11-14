import { BaseStore, Conversation, LoaderListEntry, Message } from '@llm-tools/embedjs-interfaces';

export class MemoryStore implements BaseStore {
    private loaderCustomValues: Record<string, Record<string, unknown>>;
    private loaderCustomValuesMap: Map<string, string[]>;
    private loaderList: Record<string, LoaderListEntry>;
    private conversations: Map<string, Conversation>;

    async init(): Promise<void> {
        this.loaderList = {};
        this.loaderCustomValues = Object.create(null);
        this.conversations = new Map();
        this.loaderCustomValuesMap = new Map();
    }

    async addLoaderMetadata(loaderId: string, value: LoaderListEntry): Promise<void> {
        this.loaderList[loaderId] = value;
    }

    async getLoaderMetadata(loaderId: string): Promise<LoaderListEntry> {
        return this.loaderList[loaderId];
    }

    async hasLoaderMetadata(loaderId: string): Promise<boolean> {
        return !!this.loaderList[loaderId];
    }

    async getAllLoaderMetadata(): Promise<LoaderListEntry[]> {
        return Object.values(this.loaderList);
    }

    async loaderCustomSet<T extends Record<string, unknown>>(loaderId: string, key: string, value: T): Promise<void> {
        if (!this.loaderCustomValuesMap.has(loaderId)) this.loaderCustomValuesMap.set(loaderId, []);
        this.loaderCustomValuesMap.get(loaderId).push(key);

        this.loaderCustomValues[key] = { ...value, loaderId };
    }

    async loaderCustomGet<T extends Record<string, unknown>>(key: string): Promise<T> {
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
            throw new Error("Invalid key");
        }
        const data = <T & { loaderId: string }>this.loaderCustomValues[key];
        delete data.loaderId;
        return data;
    }

    async loaderCustomHas(key: string): Promise<boolean> {
        return !!this.loaderCustomValues[key];
    }

    async loaderCustomDelete(key: string): Promise<void> {
        const loaderId = <string>this.loaderCustomValues[key].loaderId;

        delete this.loaderList[key];

        if (this.loaderCustomValuesMap.has(loaderId)) {
            this.loaderCustomValuesMap.set(
                loaderId,
                this.loaderCustomValuesMap.get(loaderId).filter((k) => k !== key),
            );
        }
    }

    async deleteLoaderMetadataAndCustomValues(loaderId: string): Promise<void> {
        if (this.loaderCustomValuesMap.has(loaderId)) {
            this.loaderCustomValuesMap.get(loaderId).forEach((key) => {
                delete this.loaderCustomValues[key];
            });
        }

        this.loaderCustomValuesMap.delete(loaderId);
        delete this.loaderList[loaderId];
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
