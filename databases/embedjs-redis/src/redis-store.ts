import { BaseStore, Conversation, LoaderListEntry, Message } from '@llm-tools/embedjs-interfaces';
import { Redis, RedisOptions } from 'ioredis';

export class RedisStore implements BaseStore {
    private static readonly LOADER_METADATA_PREFIX = 'LOADER_METADATA_';
    private static readonly CUSTOM_KEYS_PREFIX = 'CUSTOM_KEYS_';
    private readonly options: RedisOptions;
    private redis: Redis;

    constructor(options: RedisOptions) {
        options.keyPrefix = options.keyPrefix ?? 'EmbedJS';
        this.options = options;
    }

    async init(): Promise<void> {
        this.redis = new Redis(this.options);
    }

    async addLoaderMetadata(loaderId: string, value: LoaderListEntry): Promise<void> {
        await this.redis.set(`${RedisStore.LOADER_METADATA_PREFIX}_${loaderId}`, JSON.stringify(value));
    }

    async getLoaderMetadata(loaderId: string): Promise<LoaderListEntry> {
        const result = await this.redis.get(`${RedisStore.LOADER_METADATA_PREFIX}_${loaderId}`);
        return JSON.parse(result);
    }

    async hasLoaderMetadata(loaderId: string): Promise<boolean> {
        return !!(await this.redis.get(`${RedisStore.LOADER_METADATA_PREFIX}_${loaderId}`));
    }

    async getAllLoaderMetadata(): Promise<LoaderListEntry[]> {
        const loaderKeys = await this.redis.keys(`${RedisStore.LOADER_METADATA_PREFIX}_*`);
        const loaderEntries = await this.redis.mget(loaderKeys);
        return loaderEntries.map((entry) => JSON.parse(entry));
    }

    async loaderCustomSet<T extends Record<string, unknown>>(loaderId: string, key: string, value: T): Promise<void> {
        const customKeys = await this.redis.get(`${RedisStore.CUSTOM_KEYS_PREFIX}_${loaderId}`);

        let customKeysList: string[];
        if (!customKeys) customKeysList = [];
        else customKeysList = JSON.parse(customKeys);
        customKeysList.push(key);

        await this.redis.set(key, JSON.stringify(value));
        await this.redis.set(`${RedisStore.CUSTOM_KEYS_PREFIX}_${loaderId}`, JSON.stringify(customKeysList));
    }

    async loaderCustomGet<T extends Record<string, unknown>>(key: string): Promise<T> {
        const result = await this.redis.get(key);
        return JSON.parse(result);
    }

    async loaderCustomHas(key: string): Promise<boolean> {
        return !!(await this.redis.get(key));
    }

    async loaderCustomDelete(key: string): Promise<void> {
        await this.redis.del(key);
    }

    async deleteLoaderMetadataAndCustomValues(loaderId: string): Promise<void> {
        const customKeys = await this.redis.get(`${RedisStore.CUSTOM_KEYS_PREFIX}_${loaderId}`);

        if (customKeys) {
            const customKeysList = JSON.parse(customKeys);
            for (const key of customKeysList) {
                await this.redis.del(key);
            }
        }

        await this.redis.del(`${RedisStore.LOADER_METADATA_PREFIX}_${loaderId}`);
        await this.redis.del(`${RedisStore.CUSTOM_KEYS_PREFIX}_${loaderId}`);
    }

    async addConversation(conversationId: string): Promise<void> {
        await this.redis.set(`conversation_${conversationId}`, JSON.stringify({ conversationId, entries: [] }));
    }

    async getConversation(conversationId: string): Promise<Conversation> {
        const result = await this.redis.get(`conversation_${conversationId}`);
        return JSON.parse(result);
    }

    async hasConversation(conversationId: string): Promise<boolean> {
        return !!(await this.redis.get(`conversation_${conversationId}`));
    }

    async deleteConversation(conversationId: string): Promise<void> {
        await this.redis.del(`conversation_${conversationId}`);
    }

    async addEntryToConversation(conversationId: string, entry: Message): Promise<void> {
        const conversation = await this.getConversation(conversationId);
        conversation.entries.push(entry);

        await this.redis.set(`conversation_${conversationId}`, JSON.stringify(conversation));
    }

    clearConversations(): Promise<void> {
        throw new Error('Method not implemented.');
    }
}
