export interface BaseCache {
    init(): Promise<void>;
    addSeen(chunkHash: string): Promise<void>;
    hasSeen(chunkHash: string): Promise<boolean>;
}
