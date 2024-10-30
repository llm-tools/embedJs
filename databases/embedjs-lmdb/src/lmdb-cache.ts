import { BaseCache, Conversation, Message } from '@llm-tools/embedjs-interfaces';
import * as lmdb from 'lmdb';

export class LmdbCache implements BaseCache {
    private readonly dataPath: string;
    private database: lmdb.RootDatabase<Record<string, unknown>, lmdb.Key>;

    constructor({ path }: { path: string }) {
        this.dataPath = path;
    }

    async init(): Promise<void> {
        this.database = lmdb.open({
            path: this.dataPath,
            compression: true,
        });
    }

    async addLoader(loaderId: string, chunkCount: number): Promise<void> {
        await this.database.put(loaderId, { chunkCount });
    }

    async getLoader(loaderId: string): Promise<{ chunkCount: number }> {
        return <{ chunkCount: number }>this.database.get(loaderId);
    }

    async hasLoader(loaderId: string): Promise<boolean> {
        return this.database.doesExist(loaderId);
    }

    async loaderCustomSet<T extends Record<string, unknown>>(loaderCombinedId: string, value: T): Promise<void> {
        await this.database.put(loaderCombinedId, value);
    }

    async loaderCustomGet<T extends Record<string, unknown>>(loaderCombinedId: string): Promise<T> {
        return <T>this.database.get(loaderCombinedId);
    }

    async loaderCustomHas(loaderCombinedId: string): Promise<boolean> {
        return this.database.doesExist(loaderCombinedId);
    }

    async deleteLoader(loaderId: string): Promise<void> {
        await this.database.remove(loaderId);
    }

    async loaderCustomDelete(loaderCombinedId: string): Promise<void> {
        await this.database.remove(loaderCombinedId);
    }

    async addConversation(conversationId: string): Promise<void> {
        await this.database.put(`conversation_${conversationId}`, { conversationId, entries: [] });
    }

    async getConversation(conversationId: string): Promise<Conversation> {
        return <Conversation>this.database.get(`conversation_${conversationId}`);
    }

    async hasConversation(conversationId: string): Promise<boolean> {
        return this.database.doesExist(`conversation_${conversationId}`);
    }

    async deleteConversation(conversationId: string): Promise<void> {
        await this.database.remove(`conversation_${conversationId}`);
    }

    async addEntryToConversation(conversationId: string, entry: Message): Promise<void> {
        const conversation = await this.getConversation(`conversation_${conversationId}`);
        conversation.entries.push(entry);

        await this.database.put(`conversation_${conversationId}`, conversation);
    }

    async clearConversations(): Promise<void> {
        throw new Error('Method not implemented.');
    }
}
