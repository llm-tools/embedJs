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

    async setLoaderSeen(loaderId: string): Promise<void> {
        await this.database.put(loaderId, true);
    }

    async hasSeenLoader(loaderId: string): Promise<boolean> {
        return this.database.doesExist(loaderId);
    }

    async setLoaderCount(loaderId: string, count: number): Promise<void> {
        await this.database.put(loaderId, count);
    }

    async getLoaderCount(loaderId: string): Promise<number> {
        return this.database.get(loaderId);
    }
}
