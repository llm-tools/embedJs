import type { HierarchicalNSW as HierarchicalNSWType } from 'hnswlib-node';
import { BaseDb } from '../interfaces/base-db.js';
import { Chunk, EmbeddedChunk, Metadata } from '../global/types.js';

export class HNSWDb implements BaseDb {
    private index: HierarchicalNSWType;

    private docCount: number;
    private docMap: Map<number, { pageContent: string; metadata: Metadata<Record<string, string | number | boolean>> }>;

    constructor() {
        this.docCount = 0;
        this.docMap = new Map();
    }

    async init({ dimensions }: { dimensions: number }) {
        const { HierarchicalNSW } = await HNSWDb.imports();
        this.index = await new HierarchicalNSW('cosine', dimensions);
        this.index.initIndex(0);
    }

    async insertChunks(chunks: EmbeddedChunk[]): Promise<number> {
        const needed = this.index.getCurrentCount() + chunks.length;
        this.index.resizeIndex(needed);

        for (const chunk of chunks) {
            this.docCount++;
            this.index.addPoint(chunk.vector, this.docCount);
            this.docMap.set(this.docCount, { pageContent: chunk.pageContent, metadata: chunk.metadata });
        }

        return chunks.length;
    }

    async similaritySearch(query: number[], k: number): Promise<Chunk[]> {
        k = Math.min(k, this.index.getCurrentCount());
        const result = this.index.searchKnn(query, k, (label) => this.docMap.has(label));
        return result.neighbors.map((label) => this.docMap.get(label));
    }

    static async imports(): Promise<{ HierarchicalNSW: typeof HierarchicalNSWType }> {
        try {
            const {
                default: { HierarchicalNSW },
            } = await import('hnswlib-node');

            return { HierarchicalNSW };
        } catch (err) {
            throw new Error('Please install hnswlib-node as a dependency with, e.g. `npm install -S hnswlib-node`');
        }
    }
}
