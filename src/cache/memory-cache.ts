import { BaseCache } from '../interfaces/base-cache.js';

export class MemoryCache implements BaseCache {
    private loaderList: Record<string, { chunkCount: number }>;

    async init(): Promise<void> {
        this.loaderList = {};
    }

    async addLoader(loaderId: string, chunkCount: number): Promise<void> {
        this.loaderList[loaderId] = { chunkCount };
    }

    async getLoader(loaderId: string): Promise<{ chunkCount: number }> {
        return this.loaderList[loaderId];
    }

    async hasLoader(loaderId: string): Promise<boolean> {
        return this.loaderList.hasOwnProperty(loaderId);
    }
}
