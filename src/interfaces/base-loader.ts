import createDebugMessages from 'debug';

import { LoaderChunk } from '../global/types.js';
import { BaseCache } from './base-cache.js';

export abstract class BaseLoader<
    T extends Record<string, string | number | boolean> = Record<string, string | number | boolean>,
    M extends Record<string, unknown> = Record<string, null>,
> {
    private static cache?: BaseCache;

    public static setCache(cache?: BaseCache) {
        BaseLoader.cache = cache;
    }

    protected readonly uniqueId: string;

    constructor(uniqueId: string) {
        this.uniqueId = uniqueId;
        createDebugMessages('embedjs:loader:BaseLoader')(`New loader class initalized with key ${uniqueId}`);
    }

    async init() {}

    getUniqueId(): string {
        return this.uniqueId;
    }

    private getCustomCacheKey(key: string) {
        return `LOADER_CUSTOM_${this.uniqueId}_${key}`;
    }

    protected async saveToCache(key: string, value: M) {
        if (!BaseLoader.cache) return;
        await BaseLoader.cache.loaderCustomSet(this.getCustomCacheKey(key), value);
    }

    protected async getFromCache(key: string) {
        if (!BaseLoader.cache) return null;
        return BaseLoader.cache.loaderCustomGet(this.getCustomCacheKey(key));
    }

    protected async checkInCache(key: string) {
        if (!BaseLoader.cache) return false;
        return BaseLoader.cache.loaderCustomHas(this.getCustomCacheKey(key));
    }

    abstract getChunks(): AsyncGenerator<LoaderChunk<T>, void, void>;
}
