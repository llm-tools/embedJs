import createDebugMessages from 'debug';
import { Collection, Document, MongoClient } from 'mongodb';

import { BaseCache } from '../interfaces/base-cache.js';

export class MongoCache implements BaseCache {
    private readonly debug = createDebugMessages('embedjs:cache:MongoCache');
    private readonly uri: string;
    private readonly dbName: string;
    private readonly collectionName: string;
    private collection: Collection<Document>;

    constructor({ uri, dbName, collectionName }: { uri: string; dbName: string; collectionName: string }) {
        this.uri = uri;
        this.dbName = dbName;
        this.collectionName = collectionName;
    }

    async init(): Promise<void> {
        const client = new MongoClient(this.uri);
        await client.connect();

        // Create index on loaderId field
        this.collection = client.db(this.dbName).collection(this.collectionName);
        try {
            await this.collection.createIndex({ loaderId: 1 }, { unique: true });
        } catch {
            this.debug('Index on loaderId already exists.');
        }
    }

    async addLoader(loaderId: string, chunkCount: number): Promise<void> {
        await this.collection.insertOne({ loaderId, chunkCount });
    }

    async getLoader(loaderId: string): Promise<{ chunkCount: number }> {
        const result = await this.collection.findOne({ loaderId });
        return { chunkCount: result ? result.chunkCount : 0 }; // Assuming a default value of 0 if result is null
    }

    async hasLoader(loaderId: string): Promise<boolean> {
        return !!(await this.collection.findOne({ loaderId }));
    }

    async loaderCustomSet<T extends Record<string, unknown>>(loaderCombinedId: string, value: T): Promise<void> {
        const result = await this.collection.updateOne(
            { loaderId: loaderCombinedId },
            { $setOnInsert: { loaderId: loaderCombinedId, value } },
            { upsert: false },
        );

        if (result.matchedCount === 0) {
            await this.collection.insertOne({ loaderId: loaderCombinedId, value });
        }
    }

    async loaderCustomGet<T extends Record<string, unknown>>(loaderCombinedId: string): Promise<T> {
        const result = await this.collection.findOne({ loaderId: loaderCombinedId });
        return result?.value;
    }

    async loaderCustomHas(loaderCombinedId: string): Promise<boolean> {
        return !!(await this.collection.findOne({ loaderId: loaderCombinedId }));
    }

    async clear(): Promise<void> {
        await this.collection.deleteMany({});
    }

    async deleteLoader(loaderId: string): Promise<void> {
        await this.collection.deleteOne({ loaderId });
    }

    async loaderCustomDelete(loaderCombinedId: string): Promise<void> {
        await this.collection.deleteOne({ loaderId: loaderCombinedId });
    }
}
