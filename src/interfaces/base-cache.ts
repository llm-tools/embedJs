export interface BaseCache {
    init(): Promise<void>;
    addLoader(loaderId: string, chunkCount: number, chunkSeenHash: string): Promise<void>;
    getLoader(loaderId: string): Promise<{ chunkCount: number, chunkSeenHash: string }>;
    hasLoader(loaderId: string): Promise<boolean>;
}
