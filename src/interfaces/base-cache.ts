export interface BaseCache {
    init(): Promise<void>;
    addLoader(loaderId: string, chunkCount: number): Promise<void>;
    getLoader(loaderId: string): Promise<{ chunkCount: number }>;
    hasLoader(loaderId: string): Promise<boolean>;
}
