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
}
