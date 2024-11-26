import createDebugMessages from 'debug';
import { Collection, MongoClient } from 'mongodb';
import { BaseStore, Conversation, LoaderListEntry, Message } from '@llm-tools/embedjs-interfaces';

export class MongoStore implements BaseStore {
    private readonly debug = createDebugMessages('embedjs:store:MongoCache');
    private readonly uri: string;
    private readonly dbName: string;
    private readonly cacheCollectionName: string;
    private metadataCollection: Collection<LoaderListEntry & { loaderId: string }>;
    private readonly customDataCollectionName: string;
    private customDataCollection: Collection<{ loaderId: string; key: string } & Record<string, unknown>>;
    private readonly conversationCollectionName: string;
    private conversationCollection: Collection<{ conversationId: string; entries: Message[] }>;

    constructor({
        uri,
        dbName,
        cacheCollectionName = 'cache',
        customDataCollectionName = 'customData',
        conversationCollectionName = 'conversations',
    }: {
        uri: string;
        dbName: string;
        cacheCollectionName: string;
        customDataCollectionName: string;
        conversationCollectionName: string;
    }) {
        this.uri = uri;
        this.dbName = dbName;
        this.cacheCollectionName = cacheCollectionName;
        this.customDataCollectionName = customDataCollectionName;
        this.conversationCollectionName = conversationCollectionName;
    }

    async init(): Promise<void> {
        const client = new MongoClient(this.uri);
        await client.connect();

        // Create index on loaderId field
        this.metadataCollection = client.db(this.dbName).collection(this.cacheCollectionName);
        try {
            await this.metadataCollection.createIndex({ loaderId: 1 }, { unique: true });
        } catch {
            this.debug('Index on loaderId already exists on metadataCollection');
        }

        // Create index on loaderId field
        this.customDataCollection = client.db(this.dbName).collection(this.customDataCollectionName);
        try {
            await this.customDataCollection.createIndex({ loaderId: 1 });
        } catch {
            this.debug('Index on loaderId already exists on customDataCollection');
        }
        try {
            await this.customDataCollection.createIndex({ key: 1 }, { unique: true });
        } catch {
            this.debug('Index on key already exists on customDataCollection');
        }

        // Create index on conversationId field
        this.conversationCollection = client.db(this.dbName).collection(this.conversationCollectionName);
        try {
            await this.conversationCollection.createIndex({ conversationId: 1 }, { unique: true });
        } catch {
            this.debug('Index on conversationId already exists on conversationCollection');
        }
        // Create index on entries._id field
        try {
            await this.conversationCollection.createIndex({ 'entries._id': 1 });
        } catch {
            this.debug('Index on `entries._id` already exists on conversationCollection');
        }
    }

    async addLoaderMetadata(loaderId: string, value: LoaderListEntry): Promise<void> {
        await this.metadataCollection.insertOne({ ...value, loaderId });
    }

    async getLoaderMetadata(loaderId: string): Promise<LoaderListEntry> {
        const result = await this.metadataCollection.findOne({ loaderId });
        delete result.loaderId;
        delete result._id;
        return result;
    }

    async hasLoaderMetadata(loaderId: string): Promise<boolean> {
        return !!(await this.metadataCollection.findOne({ loaderId }));
    }

    async getAllLoaderMetadata(): Promise<LoaderListEntry[]> {
        const result = await this.metadataCollection.find({}).toArray();

        return result.map((entry) => {
            delete entry.loaderId;
            delete entry._id;
            return entry;
        });
    }

    async loaderCustomSet<T extends Record<string, unknown>>(loaderId: string, key: string, value: T): Promise<void> {
        await this.customDataCollection.updateOne(
            { key },
            { $setOnInsert: { ...value, key, loaderId }, $setOnUpdate: { ...value } },
            { upsert: true },
        );
    }

    async loaderCustomGet<T extends Record<string, unknown>>(key: string): Promise<T> {
        const result = await this.customDataCollection.findOne({ key });
        delete result.loaderId;
        delete result.key;
        delete result._id;
        return <T>result;
    }

    async loaderCustomHas(key: string): Promise<boolean> {
        return !!(await this.customDataCollection.findOne({ key }));
    }

    async loaderCustomDelete(key: string): Promise<void> {
        await this.customDataCollection.deleteOne({ key });
    }

    async deleteLoaderMetadataAndCustomValues(loaderId: string): Promise<void> {
        await this.metadataCollection.deleteOne({ loaderId });
        await this.customDataCollection.deleteMany({ loaderId });
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
