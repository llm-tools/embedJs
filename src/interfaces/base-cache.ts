export interface BaseCache {
    init(): Promise<void>;
    setLoaderSeen(loaderId: string): Promise<void>;
    hasSeenLoader(loaderId: string): Promise<boolean>;
    setLoaderCount(loaderId: string, count: number): Promise<void>;
    getLoaderCount(loaderId: string): Promise<number>;
}
