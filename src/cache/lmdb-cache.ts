import * as lmdb from 'lmdb';
import { BaseCache } from '../interfaces/base-cache.js';

export class LmdbCache implements BaseCache {
    private readonly dataPath: string;
    private database: lmdb.RootDatabase<any, lmdb.Key>;

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
        return this.database.get(loaderId);
    }

    async hasLoader(loaderId: string): Promise<boolean> {
        return this.database.doesExist(loaderId);
    }

    async loaderCustomSet<T extends Record<string, unknown>>(loaderCombinedId: string, value: T): Promise<void> {
        await this.database.put(loaderCombinedId, value);
    }

    async loaderCustomGet<T extends Record<string, unknown>>(loaderCombinedId: string): Promise<T> {
        return this.database.get(loaderCombinedId);
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
}
