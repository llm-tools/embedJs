import { BaseCache, Conversation, Message } from '@llm-tools/embedjs-interfaces';
import { Redis, RedisOptions } from 'ioredis';

export class RedisCache implements BaseCache {
    private readonly options: RedisOptions;
    private redis: Redis;

    constructor(options: RedisOptions) {
        options.keyPrefix = options.keyPrefix ?? 'REDIS_CACHE';
        this.options = options;
    }

    async init(): Promise<void> {
        this.redis = new Redis(this.options);
    }

    async addLoader(loaderId: string, chunkCount: number): Promise<void> {
        await this.redis.set(loaderId, JSON.stringify({ chunkCount }));
    }

    async getLoader(loaderId: string): Promise<{ chunkCount: number } | null> {
        const result = await this.redis.get(loaderId);

        if (!result) return null;
        return JSON.parse(result);
    }

    async hasLoader(loaderId: string): Promise<boolean> {
        return !!(await this.redis.get(loaderId));
    }

    async loaderCustomSet<T extends Record<string, unknown>>(loaderCombinedId: string, value: T): Promise<void> {
        await this.redis.set(loaderCombinedId, JSON.stringify(value));
    }

    async loaderCustomGet<T extends Record<string, unknown>>(loaderCombinedId: string): Promise<T> {
        const result = await this.redis.get(loaderCombinedId);

        if (!result) return null;
        return JSON.parse(result);
    }

    async loaderCustomHas(loaderCombinedId: string): Promise<boolean> {
        return !!(await this.redis.get(loaderCombinedId));
    }

    async deleteLoader(loaderId: string): Promise<void> {
        await this.redis.del(loaderId);
    }

    async loaderCustomDelete(loaderCombinedId: string): Promise<void> {
        await this.redis.del(loaderCombinedId);
    }

    async addConversation(conversationId: string): Promise<void> {
        await this.redis.set(`conversation_${conversationId}`, JSON.stringify({ conversationId, entries: [] }));
    }

    async getConversation(conversationId: string): Promise<Conversation> {
        const result = await this.redis.get(`conversation_${conversationId}`);

        if (!result) throw new Error('Conversation not found');
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
