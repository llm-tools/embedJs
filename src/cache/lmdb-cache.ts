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

    async addLoader(loaderId: string, chunkCount: number, chunkSeenHash: string): Promise<void> {
        await this.database.put(loaderId, { chunkCount, chunkSeenHash });
    }

    async getLoader(loaderId: string): Promise<{ chunkCount: number; chunkSeenHash: string }> {
        return this.database.get(loaderId);
    }

    async hasLoader(loaderId: string): Promise<boolean> {
        return this.database.doesExist(loaderId);
    }
}
