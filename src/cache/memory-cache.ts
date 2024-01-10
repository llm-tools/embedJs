import { BaseCache } from '../interfaces/base-cache.js';

export class MemoryCache implements BaseCache {
    private loaderList: Record<string, { chunkCount: number; chunkSeenHash: string }>;

    async init(): Promise<void> {
        this.loaderList = {};
    }

    async addLoader(loaderId: string, chunkCount: number, chunkSeenHash: string): Promise<void> {
        this.loaderList[loaderId] = { chunkCount, chunkSeenHash };
    }

    async getLoader(loaderId: string): Promise<{ chunkCount: number; chunkSeenHash: string }> {
        return this.loaderList[loaderId];
    }

    async hasLoader(loaderId: string): Promise<boolean> {
        return this.loaderList.hasOwnProperty(loaderId);
    }
}
