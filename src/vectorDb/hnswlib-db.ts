import HNSWLib from 'hnswlib-node';
import createDebugMessages from 'debug';

import { BaseDb } from '../interfaces/base-db.js';
import { ExtractChunkData, InsertChunkData, Metadata } from '../global/types.js';

export class HNSWDb implements BaseDb {
    private readonly debug = createDebugMessages('embedjs:vector:HNSWDb');
    private index: HNSWLib.HierarchicalNSW;

    private docCount: number;
    private docMap: Map<number, { pageContent: string; metadata: Metadata<Record<string, string | number | boolean>> }>;

    async init({ dimensions }: { dimensions: number }) {
        this.index = await new HNSWLib.HierarchicalNSW('cosine', dimensions);
        this.index.initIndex(0);
        this.docMap = new Map();
        this.docCount = 0;
    }

    async insertChunks(chunks: InsertChunkData[]): Promise<number> {
        const needed = this.index.getCurrentCount() + chunks.length;
        this.index.resizeIndex(needed);

        for (const chunk of chunks) {
            this.docCount++;
            this.index.addPoint(chunk.vector, this.docCount);
            this.docMap.set(this.docCount, { pageContent: chunk.pageContent, metadata: chunk.metadata });
        }

        return chunks.length;
    }

    async similaritySearch(query: number[], k: number): Promise<ExtractChunkData[]> {
        k = Math.min(k, this.index.getCurrentCount());
        const result = this.index.searchKnn(query, k, (label) => this.docMap.has(label));

        return result.neighbors.map((label, index) => {
            return {
                ...this.docMap.get(label),
                score: result.distances[index],
            };
        });
    }

    async getVectorCount(): Promise<number> {
        return this.index.getCurrentCount();
    }

    async deleteKeys(_uniqueLoaderId: string): Promise<boolean> {
        this.debug('deleteKeys is not supported by HNSWDb');
        return false;
    }

    async reset(): Promise<void> {
        await this.init({ dimensions: this.index.getNumDimensions() });
    }
}
