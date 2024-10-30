import createDebugMessages from 'debug';
import { Collection, Document, MongoClient } from 'mongodb';
import { BaseCache, Conversation, Message } from '@llm-tools/embedjs-interfaces';

interface ConversationDocument {
    _id?: string; // optional MongoDB ID field
    conversationId: string;
    entries: Message[]; // Explicitly stating this is an array of ConversationHistory
}

export class MongoCache implements BaseCache {
    private readonly debug = createDebugMessages('embedjs:cache:MongoCache');
    private readonly uri: string;
    private readonly dbName: string;
    private readonly cacheCollectionName: string;
    private cacheCollection: Collection<Document>;
    private readonly conversationCollectionName: string;
    private conversationCollection: Collection<ConversationDocument>;

    constructor({ uri, dbName, collectionName }: { uri: string; dbName: string; collectionName: string }) {
        this.uri = uri;
        this.dbName = dbName;
        this.cacheCollectionName = collectionName;
    }

    async init(): Promise<void> {
        const client = new MongoClient(this.uri);
        await client.connect();

        // Create index on loaderId field
        this.cacheCollection = client.db(this.dbName).collection(this.cacheCollectionName);
        try {
            await this.cacheCollection.createIndex({ loaderId: 1 }, { unique: true });
        } catch {
            this.debug('Index on loaderId already exists.');
        }

        // Create index on conversationId field
        this.conversationCollection = client
            .db(this.dbName)
            .collection<ConversationDocument>(this.conversationCollectionName);
        try {
            await this.conversationCollection.createIndex({ conversationId: 1 });
        } catch {
            this.debug('Index on conversationId already exists.');
        }
        // Create index on entries._id field
        try {
            await this.conversationCollection.createIndex({ 'entries._id': 1 });
        } catch {
            this.debug('Index on `entries._id` already exists.');
        }
    }

    async addLoader(loaderId: string, chunkCount: number): Promise<void> {
        await this.cacheCollection.insertOne({ loaderId, chunkCount });
    }

    async getLoader(loaderId: string): Promise<{ chunkCount: number }> {
        const result = await this.cacheCollection.findOne({ loaderId });
        return { chunkCount: result ? result.chunkCount : 0 }; // Assuming a default value of 0 if result is null
    }

    async hasLoader(loaderId: string): Promise<boolean> {
        return !!(await this.cacheCollection.findOne({ loaderId }));
    }

    async loaderCustomSet<T extends Record<string, unknown>>(loaderCombinedId: string, value: T): Promise<void> {
        const result = await this.cacheCollection.updateOne(
            { loaderId: loaderCombinedId },
            { $setOnInsert: { loaderId: loaderCombinedId, value } },
            { upsert: false },
        );

        if (result.matchedCount === 0) {
            await this.cacheCollection.insertOne({ loaderId: loaderCombinedId, value });
        }
    }

    async loaderCustomGet<T extends Record<string, unknown>>(loaderCombinedId: string): Promise<T> {
        const result = await this.cacheCollection.findOne({ loaderId: loaderCombinedId });
        return result?.value;
    }

    async loaderCustomHas(loaderCombinedId: string): Promise<boolean> {
        return !!(await this.cacheCollection.findOne({ loaderId: loaderCombinedId }));
    }

    async clear(): Promise<void> {
        await this.cacheCollection.deleteMany({});
    }

    async deleteLoader(loaderId: string): Promise<void> {
        await this.cacheCollection.deleteOne({ loaderId });
    }

    async loaderCustomDelete(loaderCombinedId: string): Promise<void> {
        await this.cacheCollection.deleteOne({ loaderId: loaderCombinedId });
    }

    async addConversation(conversationId: string): Promise<void> {
        await this.conversationCollection.insertOne({ conversationId, entries: [] });
    }

    async getConversation(conversationId: string): Promise<Conversation> {
        const document = await this.conversationCollection.findOne({ conversationId });

        return {
            conversationId: document.conversationId,
            entries: document.entries as Message[],
        };
    }

    async hasConversation(conversationId: string): Promise<boolean> {
        return !!(await this.conversationCollection.findOne({ conversationId }));
    }

    async deleteConversation(conversationId: string): Promise<void> {
        await this.conversationCollection.deleteOne({ conversationId });
    }

    async addEntryToConversation(conversationId: string, entry: Message): Promise<void> {
        await this.conversationCollection.updateOne(
            { conversationId },
            { $push: { entries: entry } }, // Correctly structured $push operation
        );
    }

    async clearConversations(): Promise<void> {
        await this.conversationCollection.deleteMany({});
    }
}
