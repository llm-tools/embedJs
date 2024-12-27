import md5 from 'md5';
import createDebugMessages from 'debug';
import { EventEmitter } from 'node:events';

import { BaseStore } from './base-store.js';
import { LoaderChunk, UnfilteredLoaderChunk } from '../types.js';
import { BaseModel } from './base-model.js';

export abstract class BaseLoader<
    MetadataTemplate extends Record<string, string | number | boolean> = Record<string, string | number | boolean>,
    CacheTemplate extends Record<string, unknown> = Record<string, unknown>,
> extends EventEmitter {
    private static store: BaseStore;

    public static setCache(store: BaseStore) {
        BaseLoader.store = store;
    }

    protected readonly uniqueId: string;
    protected readonly chunkSize: number;
    protected readonly chunkOverlap: number;
    public readonly canIncrementallyLoad: boolean;
    protected readonly loaderMetadata: Record<string, unknown>;

    constructor(
        uniqueId: string,
        loaderMetadata: Record<string, unknown>,
        chunkSize = 5,
        chunkOverlap = 0,
        canIncrementallyLoad = false,
    ) {
        super();

        this.uniqueId = uniqueId;
        this.chunkSize = chunkSize;
        this.chunkOverlap = chunkOverlap;
        this.loaderMetadata = loaderMetadata;
        this.canIncrementallyLoad = canIncrementallyLoad;

        createDebugMessages('embedjs:loader:BaseLoader')(`New loader class initalized with key ${uniqueId}`);
    }

    public getUniqueId(): string {
        return this.uniqueId;
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    public async init(): Promise<void> {}

    // eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
    public injectModel(_model: BaseModel) {}

    private async recordLoaderInCache(chunksProcessed: number) {
        if (!BaseLoader.store) return;

        const loaderData = {
            uniqueId: this.uniqueId,
            type: this.constructor.name,
            loaderMetadata: this.loaderMetadata,
            chunksProcessed,
        };

        await BaseLoader.store.addLoaderMetadata(this.uniqueId, loaderData);
    }

    private getCustomCacheKey(key: string) {
        return `LOADER_CUSTOM_${this.uniqueId}_${key}`;
    }

    protected async checkInCache(key: string) {
        if (!BaseLoader.store) return false;
        return BaseLoader.store.loaderCustomHas(this.getCustomCacheKey(key));
    }

    protected async getFromCache(key: string): Promise<CacheTemplate> {
        if (!BaseLoader.store) return null;
        return BaseLoader.store.loaderCustomGet(this.getCustomCacheKey(key));
    }

    protected async saveToCache(key: string, value: CacheTemplate) {
        if (!BaseLoader.store) return;
        await BaseLoader.store.loaderCustomSet(this.uniqueId, this.getCustomCacheKey(key), value);
    }

    protected async deleteFromCache(key: string) {
        if (!BaseLoader.store) return false;
        return BaseLoader.store.loaderCustomDelete(this.getCustomCacheKey(key));
    }

    protected async loadIncrementalChunk(
        incrementalGenerator: AsyncGenerator<LoaderChunk<MetadataTemplate>, void, void>,
    ) {
        this.emit('incrementalChunkAvailable', incrementalGenerator);
    }

    /**
     * This TypeScript function asynchronously processes chunks of data, cleans up the content,
     * calculates a content hash, and yields the modified chunks.
     */
    public async *getChunks(): AsyncGenerator<LoaderChunk<MetadataTemplate>, void, void> {
        const chunks = await this.getUnfilteredChunks();

        let count = 0;
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
                count++;
            }
        }

        await this.recordLoaderInCache(count);
    }

    abstract getUnfilteredChunks(): AsyncGenerator<UnfilteredLoaderChunk<MetadataTemplate>, void, void>;
}
