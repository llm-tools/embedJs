import createDebugMessages from 'debug';
import { Collection, MongoClient } from 'mongodb';
import { BaseConversation, Conversation, Message } from '@llm-tools/embedjs-interfaces';

interface ConversationDocument {
    _id?: string; // optional MongoDB ID field
    conversationId: string;
    entries: Message[]; // Explicitly stating this is an array of ConversationHistory
}

export class MongoConversation implements BaseConversation {
    private readonly debug = createDebugMessages('embedjs:conversation:MongoConversation');
    private readonly uri: string;
    private readonly dbName: string;
    private readonly collectionName: string;
    private collection: Collection<ConversationDocument>;

    constructor({ uri, dbName, collectionName }: { uri: string; dbName: string; collectionName: string }) {
        this.uri = uri;
        this.dbName = dbName;
        this.collectionName = collectionName;
    }

    async init(): Promise<void> {
        const client = new MongoClient(this.uri);
        await client.connect();

        this.collection = client.db(this.dbName).collection<ConversationDocument>(this.collectionName);

        try {
            await this.collection.createIndex({ conversationId: 1 });
        } catch {
            this.debug('Index on conversationId already exists.');
        }

        try {
            await this.collection.createIndex({ 'entries._id': 1 });
        } catch {
            this.debug('Index on `entries._id` already exists.');
        }
    }

    async addConversation(conversationId: string): Promise<void> {
        // Check if conversation already exists to prevent duplication
        const exists = await this.hasConversation(conversationId);
        if (!exists) {
            await this.collection.insertOne({ conversationId, entries: [] });
        }
    }

    async getConversation(conversationId: string): Promise<Conversation> {
        const document = await this.collection.findOne({ conversationId });
        if (!document) {
            // If not found, create a new one automatically
            await this.addConversation(conversationId);
            return { conversationId, entries: [] };
        }
        return {
            conversationId: document.conversationId,
            entries: document.entries as Message[],
        };
    }

    async hasConversation(conversationId: string): Promise<boolean> {
        return !!(await this.collection.findOne({ conversationId }));
    }

    async deleteConversation(conversationId: string): Promise<void> {
        await this.collection.deleteOne({ conversationId });
    }

    async addEntryToConversation(conversationId: string, entry: Message): Promise<void> {
        await this.collection.updateOne(
            { conversationId },
            { $push: { entries: entry } }, // Correctly structured $push operation
        );
    }

    async clearConversations(): Promise<void> {
        await this.collection.deleteMany({});
    }
}
