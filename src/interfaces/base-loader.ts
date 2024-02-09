import createDebugMessages from 'debug';
import { EventEmitter } from 'node:events';

import { LoaderChunk } from '../global/types.js';
import { BaseCache } from './base-cache.js';

export abstract class BaseLoader<
    T extends Record<string, string | number | boolean> = Record<string, string | number | boolean>,
    M extends Record<string, unknown> = Record<string, null>,
> extends EventEmitter {
    private static cache?: BaseCache;

    public static setCache(cache?: BaseCache) {
        BaseLoader.cache = cache;
    }

    protected readonly uniqueId: string;
    private readonly _canIncrementallyLoad: boolean;

    constructor(uniqueId: string, canIncrementallyLoad: boolean = false) {
        super();
        this.uniqueId = uniqueId;
        this._canIncrementallyLoad = canIncrementallyLoad;
        createDebugMessages('embedjs:loader:BaseLoader')(`New loader class initalized with key ${uniqueId}`);
    }

    public async init(): Promise<void> {}

    public get canIncrementallyLoad() {
        return this._canIncrementallyLoad;
    }

    getUniqueId(): string {
        return this.uniqueId;
    }

    private getCustomCacheKey(key: string) {
        return `LOADER_CUSTOM_${this.uniqueId}_${key}`;
    }

    protected async checkInCache(key: string) {
        if (!BaseLoader.cache) return false;
        return BaseLoader.cache.loaderCustomHas(this.getCustomCacheKey(key));
    }

    protected async getFromCache(key: string) {
        if (!BaseLoader.cache) return null;
        return BaseLoader.cache.loaderCustomGet(this.getCustomCacheKey(key));
    }

    protected async saveToCache(key: string, value: M) {
        if (!BaseLoader.cache) return;
        await BaseLoader.cache.loaderCustomSet(this.getCustomCacheKey(key), value);
    }

    protected async deleteFromCache(key: string) {
        if (!BaseLoader.cache) return false;
        return BaseLoader.cache.loaderCustomDelete(this.getCustomCacheKey(key));
    }

    protected async loadIncrementalChunk(incrementalGenerator: AsyncGenerator<LoaderChunk<T>, void, void>) {
        this.emit('incrementalChunkAvailable', incrementalGenerator);
    }

    abstract getChunks(): AsyncGenerator<LoaderChunk<T>, void, void>;
}
