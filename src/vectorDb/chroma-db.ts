import { ChromaClient, Collection } from 'chromadb';

import { BaseDb } from '../interfaces/base-db.js';
import { Chunk, EmbeddedChunk } from '../global/types.js';

export class ChromaDb implements BaseDb {
    private static readonly STATIC_COLLECTION_NAME = 'vectors';
    private readonly url: string;
    private collection: Collection;

    constructor({ url }: { url: string }) {
        this.url = url;
    }

    async init() {
        const client = new ChromaClient({ path: this.url });

        const list = await client.listCollections();
        if (list.map((e) => e.name).indexOf(ChromaDb.STATIC_COLLECTION_NAME) > -1)
            this.collection = await client.getCollection({ name: ChromaDb.STATIC_COLLECTION_NAME });
        else this.collection = await client.createCollection({ name: ChromaDb.STATIC_COLLECTION_NAME });
    }

    async insertChunks(chunks: EmbeddedChunk[]): Promise<number> {
        const mapped = chunks.map((chunk) => {
            return {
                id: chunk.metadata.id,
                pageContent: chunk.pageContent,
                vector: chunk.vector,
                metadata: chunk.metadata,
            };
        });

        await this.collection.add({
            ids: mapped.map((e) => e.id),
            embeddings: mapped.map((e) => e.vector),
            metadatas: mapped.map((e) => e.metadata),
            documents: mapped.map((e) => e.pageContent),
        });

        return mapped.length;
    }

    async similaritySearch(query: number[], k: number): Promise<Chunk[]> {
        const results = await this.collection.query({
            nResults: k,
            queryEmbeddings: [query],
        });

        return results.documents[0].map((result, index) => {
            return {
                pageContent: result,
                metadata: {
                    id: results.ids[0][index],
                    ...(<{ source: string; uniqueLoaderId: string }>results.metadatas[0][index]),
                },
            };
        });
    }

    async getVectorCount(): Promise<number> {
        return this.collection.count();
    }

    async deleteKeys(uniqueLoaderId: string): Promise<boolean> {
        await this.collection.delete({
            where: {
                uniqueLoaderId,
            },
        });
        return true;
    }

    async reset(): Promise<void> {
        const client = new ChromaClient({ path: this.url });
        await client.deleteCollection({ name: ChromaDb.STATIC_COLLECTION_NAME });
        this.collection = await client.createCollection({ name: ChromaDb.STATIC_COLLECTION_NAME });
    }
}
