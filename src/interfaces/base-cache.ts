export interface BaseCache {
    init(): Promise<void>;
    addLoader(loaderId: string, chunkCount: number): Promise<void>;
    getLoader(loaderId: string): Promise<{ chunkCount: number }>;
    hasLoader(loaderId: string): Promise<boolean>;

    loaderCustomSet<T extends Record<string, unknown>>(loaderCombinedId: string, value: T): Promise<void>;
    loaderCustomGet<T extends Record<string, unknown>>(loaderCombinedId: string): Promise<T>;
    loaderCustomHas(loaderCombinedId: string): Promise<boolean>;
}
