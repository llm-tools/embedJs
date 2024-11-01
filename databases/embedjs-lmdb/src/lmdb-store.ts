import { BaseStore, Conversation, LoaderListEntry, Message } from '@llm-tools/embedjs-interfaces';
import * as lmdb from 'lmdb';

export class LmdbStore implements BaseStore {
    private static readonly LOADER_METADATA_PREFIX = 'LOADER_METADATA_';
    private static readonly CUSTOM_KEYS_PREFIX = 'CUSTOM_KEYS_';

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

    async addLoaderMetadata(loaderId: string, value: LoaderListEntry): Promise<void> {
        let loaderKeys: { list: string[] };
        if (this.database.doesExist(`${LmdbStore.LOADER_METADATA_PREFIX}_ALL`))
            loaderKeys = <{ list: [] }>this.database.get(`${LmdbStore.LOADER_METADATA_PREFIX}_ALL`);
        else loaderKeys = { list: [] };
        loaderKeys.list.push(loaderId);

        await this.database.put(`${LmdbStore.LOADER_METADATA_PREFIX}_ALL`, loaderKeys);
        await this.database.put(`${LmdbStore.LOADER_METADATA_PREFIX}_${loaderId}`, value);
    }

    async getLoaderMetadata(loaderId: string): Promise<LoaderListEntry> {
        return <LoaderListEntry>this.database.get(`${LmdbStore.LOADER_METADATA_PREFIX}_${loaderId}`);
    }

    async hasLoaderMetadata(loaderId: string): Promise<boolean> {
        return this.database.doesExist(`${LmdbStore.LOADER_METADATA_PREFIX}_${loaderId}`);
    }

    async getAllLoaderMetadata(): Promise<LoaderListEntry[]> {
        const loaderKeys = <{ list: string[] }>this.database.get(`${LmdbStore.LOADER_METADATA_PREFIX}_ALL`);
        return loaderKeys.list.map(
            (loaderId) => <LoaderListEntry>this.database.get(`${LmdbStore.LOADER_METADATA_PREFIX}_${loaderId}`),
        );
    }

    async loaderCustomSet<T extends Record<string, unknown>>(loaderId: string, key: string, value: T): Promise<void> {
        let customKeys: { list: string[] };
        if (this.database.doesExist(`${LmdbStore.CUSTOM_KEYS_PREFIX}_${loaderId}`))
            customKeys = <{ list: [] }>this.database.get(`${LmdbStore.CUSTOM_KEYS_PREFIX}_${loaderId}`);
        else customKeys = { list: [] };
        customKeys.list.push(key);

        await this.database.put(`${LmdbStore.CUSTOM_KEYS_PREFIX}_${loaderId}`, customKeys);
        await this.database.put(key, { ...value, loaderId });
    }

    async loaderCustomGet<T extends Record<string, unknown>>(key: string): Promise<T> {
        const data = <T & { loaderId: string }>this.database.get(key);
        delete data.loaderId;
        return data;
    }

    async loaderCustomHas(key: string): Promise<boolean> {
        return this.database.doesExist(key);
    }

    async loaderCustomDelete(key: string): Promise<void> {
        const { loaderId } = <{ loaderId: string }>this.database.get(key);
        const customKeys = <{ list: string[] }>this.database.get(`${LmdbStore.CUSTOM_KEYS_PREFIX}_${loaderId}`);
        customKeys.list = customKeys.list.filter((k) => k !== key);
        await this.database.put(`${LmdbStore.CUSTOM_KEYS_PREFIX}_${loaderId}`, customKeys);
        await this.database.remove(key);
    }

    async deleteLoaderMetadataAndCustomValues(loaderId: string): Promise<void> {
        const customKeys = <{ list: string[] }>this.database.get(`${LmdbStore.CUSTOM_KEYS_PREFIX}_${loaderId}`);
        for (const key of customKeys.list) {
            await this.database.remove(key);
        }
        await this.database.remove(`${LmdbStore.CUSTOM_KEYS_PREFIX}_${loaderId}`);
        await this.database.remove(`${LmdbStore.LOADER_METADATA_PREFIX}_${loaderId}`);
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
