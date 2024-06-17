import { MongoClient } from 'mongodb';
import { Conversation, ConversationEntry } from '../global/types.js';
import { BaseConversations } from '../interfaces/base-conversations.js';

interface ConversationDocument {
    _id?: string; // optional MongoDB ID field
    conversationId: string;
    entries: ConversationEntry[]; // Explicitly stating this is an array of ConversationHistory
}

export class MongoConversations implements BaseConversations {
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
        const collection = this.client.db(this.dbName).collection<ConversationDocument>(this.collectionName);
        await collection.createIndex({ conversationId: 1 });
        await collection.createIndex({ "entries._id": 1 });
    }

    async addConversation(conversationId: string): Promise<void> {
        const collection = this.client.db(this.dbName).collection(this.collectionName);
        // Check if conversation already exists to prevent duplication
        const exists = await this.hasConversation(conversationId);
        if (!exists) {
            await collection.insertOne({ conversationId, entries: [] });
        }
    }

    async getConversation(conversationId: string): Promise<Conversation> {
        const collection = this.client.db(this.dbName).collection(this.collectionName);
        const document = await collection.findOne({ conversationId });
        if (!document) {
            // If not found, create a new one automatically
            await this.addConversation(conversationId);
            return { conversationId, entries: [] };
        }
        return {
            conversationId: document.conversationId,
            entries: document.entries as ConversationEntry[]
        };
    }

    async hasConversation(conversationId: string): Promise<boolean> {
        const collection = this.client.db(this.dbName).collection(this.collectionName);
        const result = await collection.findOne({ conversationId });
        return !!result;
    }

    async deleteConversation(conversationId: string): Promise<void> {
        const collection = this.client.db(this.dbName).collection(this.collectionName);
        await collection.deleteOne({ conversationId });
    }

    async addEntryToConversation(conversationId: string, entry: ConversationEntry): Promise<void> {
        const collection = this.client.db(this.dbName).collection<ConversationDocument>(this.collectionName);
        await collection.updateOne(
            { conversationId },
            { $push: { entries: entry } } // Correctly structured $push operation
        );
    }

    async clearConversations(): Promise<void> {
        const collection = this.client.db(this.dbName).collection(this.collectionName);
        await collection.deleteMany({});
    }

    async close(): Promise<void> {
        await this.client.close();
    }
}