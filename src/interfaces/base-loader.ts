import md5 from 'md5';
import createDebugMessages from 'debug';
import { EventEmitter } from 'node:events';

import { LoaderChunk, UnfilteredLoaderChunk } from '../global/types.js';
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
    protected readonly chunkOverlap: number;
    protected readonly chunkSize: number;

    constructor(
        uniqueId: string,
        chunkSize: number = 5,
        chunkOverlap: number = 0,
        canIncrementallyLoad: boolean = false,
    ) {
        super();

        this.uniqueId = uniqueId;
        this._canIncrementallyLoad = canIncrementallyLoad;
        this.chunkOverlap = chunkOverlap;
        this.chunkSize = chunkSize;
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

    public async *getChunks(): AsyncGenerator<LoaderChunk<T>, void, void> {
        const chunks = await this.getUnfilteredChunks();

        for await (const chunk of chunks) {
            chunk.pageContent = chunk.pageContent
                .replace(/(\r\n|\n|\r)/gm, ' ')
                .replace(/\s\s+/g, ' ')
                .trim();

            if (chunk.pageContent.length > 0) {
                yield {
                    ...chunk,
                    contentHash: md5(chunk.pageContent),
                };
            }
        }
    }

    abstract getUnfilteredChunks(): AsyncGenerator<UnfilteredLoaderChunk<T>, void, void>;
}
