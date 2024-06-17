import { MongoClient } from 'mongodb';
import { BaseCache } from '../interfaces/base-cache.js';

export class MongoCache implements BaseCache {
    private readonly uri: string;
    private readonly dbName: string;
    private readonly collectionName: string;
    private client: MongoClient;

    constructor({ uri, dbName, collectionName }: { uri: string, dbName: string, collectionName: string }) {
        this.uri = uri;
        this.dbName = dbName;
        this.collectionName = collectionName;
    }

    async init(): Promise<void> {
        this.client = new MongoClient(this.uri);
        await this.client.connect();

        // Create index on loaderId field
        const collection = this.client.db(this.dbName).collection(this.collectionName);
        try {
            await collection.createIndex({ loaderId: 1 }, { unique: true });
        } catch (error: any) {
            //this.debug('Index on loaderId already exists.');
        }
    }

    async addLoader(loaderId: string, chunkCount: number): Promise<void> {
        const collection = this.client.db(this.dbName).collection(this.collectionName);
        await collection.insertOne({ loaderId, chunkCount });
    }

    async getLoader(loaderId: string): Promise<{ chunkCount: number }> {
        const collection = this.client.db(this.dbName).collection(this.collectionName);
        const result = await collection.findOne({ loaderId });
        return { chunkCount: result ? result.chunkCount : 0 }; // Assuming a default value of 0 if result is null
    }

    async hasLoader(loaderId: string): Promise<boolean> {
        const collection = this.client.db(this.dbName).collection(this.collectionName);
        const result = await collection.findOne({ loaderId });
        return !!result;
    }

    async loaderCustomSet<T extends Record<string, unknown>>(loaderCombinedId: string, value: T): Promise<void> {
        const collection = this.client.db(this.dbName).collection(this.collectionName);
        const result = await collection.updateOne(
            { loaderId: loaderCombinedId },
            { $setOnInsert: { loaderId: loaderCombinedId, value } },
            { upsert: false }
        );

        if (result.matchedCount === 0) {
            await collection.insertOne({ loaderId: loaderCombinedId, value });
        }
    }

    async loaderCustomGet<T extends Record<string, unknown>>(loaderCombinedId: string): Promise<T> {
        const collection = this.client.db(this.dbName).collection(this.collectionName);
        const result = await collection.findOne({ loaderId: loaderCombinedId });
        return result?.value;
    }

    async loaderCustomHas(loaderCombinedId: string): Promise<boolean> {
        const collection = this.client.db(this.dbName).collection(this.collectionName);
        const result = await collection.findOne({ loaderId: loaderCombinedId });
        return !!result;
    }

    async clear(): Promise<void> {
        const collection = this.client.db(this.dbName).collection(this.collectionName);
        await collection.deleteMany({});
    }

    async deleteLoader(loaderId: string): Promise<void> {
        const collection = this.client.db(this.dbName).collection(this.collectionName);
        await collection.deleteOne({ loaderId });
    }

    async loaderCustomDelete(loaderCombinedId: string): Promise<void> {
        const collection = this.client.db(this.dbName).collection(this.collectionName);
        await collection.deleteOne({ loaderId: loaderCombinedId });
    }

    async close(): Promise<void> {
        await this.client.close();
    }
}