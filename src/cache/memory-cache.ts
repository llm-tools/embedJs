import { BaseCache } from '../interfaces/base-cache.js';

export class MemoryCache implements BaseCache {
    private data: Record<string, boolean>;

    async init(): Promise<void> {
        this.data = {};
    }

    async addSeen(chunkHash: string): Promise<void> {
        this.data[chunkHash] = true;
    }

    async hasSeen(chunkHash: string): Promise<boolean> {
        return this.data.hasOwnProperty(chunkHash);
    }
}
