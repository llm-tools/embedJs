import { Collection, DataAPIClient, Db } from '@datastax/astra-db-ts';
import { BaseVectorDatabase, InsertChunkData, ExtractChunkData } from '@llm-tools/embedjs-interfaces';

export class AstraDb implements BaseVectorDatabase {
    private db: Db;
    private collectionName: string;
    private collection: Collection;
    private dimensions: number;

    constructor({
        endpoint,
        apiKey,
        collectionName,
        keyspace = 'default_keyspace',
    }: {
        endpoint: string;
        apiKey: string;
        keyspace?: string;
        collectionName: string;
    }) {
        const client = new DataAPIClient(apiKey);
        this.db = client.db(endpoint, { keyspace });
        this.collectionName = collectionName;
    }

    async init({ dimensions }: { dimensions: number }): Promise<void> {
        this.dimensions = dimensions;
        this.collection = await this.db.createCollection(this.collectionName, {
            vector: { dimension: dimensions, metric: 'cosine' },
        });
    }

    async insertChunks(chunks: InsertChunkData[]): Promise<number> {
        const result = await this.collection.insertMany(
            chunks.map((chunk) => ({
                $vector: chunk.vector,
                metadata: chunk.metadata,
                pageContent: chunk.pageContent,
            })),
        );
        return result.insertedCount;
    }

    async similaritySearch(query: number[], k: number): Promise<ExtractChunkData[]> {
        const cursor = this.collection.find({}, { sort: { $vector: query }, limit: k, includeSimilarity: true });
        const results = await cursor.toArray();
        return results.map((result) => ({
            score: result.similarity,
            pageContent: result.pageContent,
            metadata: result.metadata,
        }));
    }

    async getVectorCount(): Promise<number> {
        // This gives a very rough estimate of the number of documents in the collection. It is not guaranteed to be accurate, and should not be used as a source of truth for the number of documents in the collection.
        return this.collection.estimatedDocumentCount();
    }

    async deleteKeys(uniqueLoaderId: string): Promise<boolean> {
        const result = await this.collection.deleteMany({ 'metadata.uniqueLoaderId': uniqueLoaderId });
        return result.deletedCount > 0;
    }
    async reset(): Promise<void> {
        await this.collection.drop();
        await this.init({ dimensions: this.dimensions });
    }
}
