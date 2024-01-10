import { BaseCache } from '../interfaces/base-cache.js';

export class MemoryCache implements BaseCache {
    private loaderList: Record<string, boolean>;
    private loaderCount: Record<string, number>;

    async init(): Promise<void> {
        this.loaderList = {};
        this.loaderCount = {};
    }

    async setLoaderSeen(loaderId: string): Promise<void> {
        this.loaderList[loaderId] = true;
    }

    async hasSeenLoader(loaderId: string): Promise<boolean> {
        return this.loaderList.hasOwnProperty(loaderId);
    }

    async setLoaderCount(loaderId: string, count: number): Promise<void> {
        this.loaderCount[loaderId] = count;
    }

    async getLoaderCount(loaderId: string): Promise<number> {
        return this.loaderCount[loaderId];
    }
}
