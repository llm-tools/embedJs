import { Redis, RedisOptions } from 'ioredis';
import { BaseCache } from '../interfaces/base-cache.js';

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

    async setLoaderSeen(loaderId: string): Promise<void> {
        await this.redis.set(loaderId, 1);
    }

    async hasSeenLoader(loaderId: string): Promise<boolean> {
        return (await this.redis.get(loaderId)) === '1';
    }

    async setLoaderCount(loaderId: string, count: number): Promise<void> {
        await this.redis.set(loaderId, count);
    }

    async getLoaderCount(loaderId: string): Promise<number> {
        const result = await this.redis.get(loaderId);

        if (!result) return 0;
        return parseInt(result);
    }
}
