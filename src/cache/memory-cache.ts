import { BaseCache } from '../interfaces/base-cache.js';

export class MemoryCache implements BaseCache {
    private loaderList: Record<string, { chunkCount: number }>;
    private loaderCustomValues: Record<string, Record<string, unknown>>;

    async init(): Promise<void> {
        this.loaderList = {};
        this.loaderCustomValues = {};
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

    async loaderCustomSet<T extends Record<string, unknown>>(loaderCombinedId: string, value: T): Promise<void> {
        this.loaderCustomValues[loaderCombinedId] = value;
    }

    async loaderCustomGet<T extends Record<string, unknown>>(loaderCombinedId: string): Promise<T> {
        return <T>this.loaderCustomValues[loaderCombinedId];
    }

    async loaderCustomHas(loaderCombinedId: string): Promise<boolean> {
        return this.loaderCustomValues.hasOwnProperty(loaderCombinedId);
    }

    async deleteLoader(loaderId: string): Promise<void> {
        delete this.loaderList[loaderId];
    }

    async loaderCustomDelete(loaderCombinedId: string): Promise<void> {
        delete this.loaderList[loaderCombinedId];
    }
}
