import { ExtractChunkData, InsertChunkData } from '../types.js';

export interface BaseDb {
    init({ dimensions }: { dimensions: number }): Promise<void>;
    insertChunks(chunks: InsertChunkData[]): Promise<number>;
    similaritySearch(query: number[], k: number): Promise<ExtractChunkData[]>;
    getVectorCount(): Promise<number>;

    deleteKeys(uniqueLoaderId: string): Promise<boolean>;
    reset(): Promise<void>;
}
