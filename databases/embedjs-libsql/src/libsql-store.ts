import createDebugMessages from 'debug';
import { Client, createClient } from '@libsql/client';
import { BaseStore, Conversation, LoaderListEntry, Message } from '@llm-tools/embedjs-interfaces';

export class LibSqlStore implements BaseStore {
    private readonly debug = createDebugMessages('embedjs:store:LibSqlStore');
    private readonly loadersCustomDataTableName: string;
    private readonly conversationsTableName: string;
    private readonly loadersTableName: string;
    private readonly client: Client;

    constructor({
        path,
        loadersTableName,
        conversationsTableName,
        loadersCustomDataTableName,
    }: {
        path: string;
        loadersTableName?: string;
        conversationsTableName?: string;
        loadersCustomDataTableName?: string;
    }) {
        this.loadersCustomDataTableName = loadersCustomDataTableName ?? 'loaderCustomData';
        this.conversationsTableName = conversationsTableName ?? 'conversations';
        this.loadersTableName = loadersTableName ?? 'loaders';
        this.client = createClient({
            url: `file:${path}`,
        });
    }

    async init(): Promise<void> {
        this.debug(`Creating table '${this.conversationsTableName}'`);
        await this.client.execute(`CREATE TABLE IF NOT EXISTS ${this.conversationsTableName} (
            id              TEXT PRIMARY KEY,
            conversationId  TEXT NOT NULL,
            content         TEXT NOT NULL,
            timestamp       TEXT NOT NULL,
            actor           TEXT NOT NULL,
            sources         TEXT
        );

        CREATE INDEX ${this.conversationsTableName}_index ON ${this.conversationsTableName} (conversationId);`);
        this.debug(`Created table '${this.conversationsTableName}' and related indexes`);

        this.debug(`Creating table '${this.loadersTableName}'`);
        await this.client.execute(`CREATE TABLE IF NOT EXISTS ${this.loadersTableName} (
            id              TEXT PRIMARY KEY,
            type            TEXT NOT NULL,
            chunksProcessed INTEGER,
            metadata        TEXT
        );`);
        this.debug(`Created table '${this.loadersTableName}'`);

        this.debug(`Creating table '${this.loadersCustomDataTableName}'`);
        await this.client.execute(`CREATE TABLE IF NOT EXISTS ${this.loadersCustomDataTableName} (
            key             TEXT PRIMARY KEY,
            loaderId        TEXT NOT NULL,
            value           TEXT
        );

        CREATE INDEX ${this.loadersCustomDataTableName}_index ON ${this.loadersCustomDataTableName} (loaderId);`);
        this.debug(`Created table '${this.loadersCustomDataTableName}' and related indexes`);
    }

    async addLoaderMetadata(loaderId: string, value: LoaderListEntry): Promise<void> {
        await this.client.execute(`DELETE FROM ${this.loadersTableName} WHERE id = '${loaderId}';`);

        await this.client.execute({
            sql: `INSERT INTO ${this.loadersTableName} (id, type, chunksProcessed, metadata)
                VALUES (?, ?, ?, ?)`,
            args: [loaderId, value.type, value.chunksProcessed, JSON.stringify(value.loaderMetadata)],
        });
    }

    async getLoaderMetadata(loaderId: string): Promise<LoaderListEntry> {
        const results = await this.client.execute({
            sql: `SELECT type, chunksProcessed, metadata FROM ${this.loadersTableName} WHERE id = ?;`,
            args: [loaderId],
        });

        const result = results.rows[0];
        const metadata = JSON.parse(result.metadata.toString());

        return {
            uniqueId: loaderId,
            loaderMetadata: metadata,
            chunksProcessed: Number.parseInt(result.chunksProcessed.toString()),
            type: result.type.toString(),
        };
    }

    async hasLoaderMetadata(loaderId: string): Promise<boolean> {
        const results = await this.client.execute({
            sql: `SELECT type, chunksProcessed, metadata FROM ${this.loadersTableName} WHERE id = ?;`,
            args: [loaderId],
        });

        return results.rows.length > 0;
    }

    async getAllLoaderMetadata(): Promise<LoaderListEntry[]> {
        const results = await this.client.execute(
            `SELECT id, type, chunksProcessed, metadata FROM ${this.loadersTableName};`,
        );

        return results.rows.map((result) => {
            const metadata = JSON.parse(result.metadata.toString());

            return {
                uniqueId: result.id.toString(),
                loaderMetadata: metadata,
                chunksProcessed: Number.parseInt(result.chunksProcessed.toString()),
                type: result.type.toString(),
            };
        });
    }

    async loaderCustomSet<T extends Record<string, unknown>>(loaderId: string, key: string, value: T): Promise<void> {
        this.debug(`LibSQL custom set '${key}' with values`, value);
        await this.loaderCustomDelete(key);

        this.debug(`LibSQL custom set '${key}' insert started`);
        const results = await this.client.execute({
            sql: `INSERT INTO ${this.loadersCustomDataTableName} (key, loaderId, value)
                VALUES (?, ?, ?)`,
            args: [key, loaderId, JSON.stringify(value)],
        });

        this.debug(`LibSQL custom set for key '${key}' resulted in`, results.rowsAffected);
    }

    async loaderCustomGet<T extends Record<string, unknown>>(key: string): Promise<T> {
        const results = await this.client.execute({
            sql: `SELECT value FROM ${this.loadersCustomDataTableName} WHERE key = ?;`,
            args: [key],
        });

        return JSON.parse(results.rows[0].value.toString());
    }

    async loaderCustomHas(key: string): Promise<boolean> {
        const results = await this.client.execute({
            sql: `SELECT value FROM ${this.loadersCustomDataTableName} WHERE key = ?;`,
            args: [key],
        });

        return results.rows.length > 0;
    }

    async loaderCustomDelete(key: string): Promise<void> {
        this.debug(`LibSQL custom delete '${key}'`);
        const results = await this.client.execute(
            `DELETE FROM ${this.loadersCustomDataTableName} WHERE key = '${key}';`,
        );
        this.debug(`LibSQL custom delete for key '${key}' resulted in`, results.rowsAffected);
    }

    async deleteLoaderMetadataAndCustomValues(loaderId: string): Promise<void> {
        this.debug(`LibSQL deleteLoaderMetadataAndCustomValues for loader '${loaderId}'`);
        await this.client.execute(`DELETE FROM ${this.loadersTableName} WHERE id = '${loaderId}';`);
        await this.client.execute(`DELETE FROM ${this.loadersCustomDataTableName} WHERE loaderId = '${loaderId}';`);
    }

    async getConversation(conversationId: string): Promise<Conversation> {
        const results = await this.client.execute({
            sql: `SELECT id, conversationId, content, timestamp, actor, sources FROM ${this.conversationsTableName} WHERE conversationId = ?;`,
            args: [conversationId],
        });

        return {
            conversationId,
            entries: results.rows.map((result) => {
                const timestamp = new Date(result.timestamp.toString());
                const actor = result.actor.toString();

                if (actor === 'AI') {
                    return {
                        actor: 'AI',
                        id: result.id.toString(),
                        content: result.content.toString(),
                        sources: JSON.parse(result.sources.toString()),
                        timestamp,
                    };
                } else {
                    return {
                        id: result.id.toString(),
                        content: result.content.toString(),
                        actor: <'HUMAN' | 'SYSTEM'>actor,
                        timestamp,
                    };
                }
            }),
        };
    }

    async hasConversation(conversationId: string): Promise<boolean> {
        const results = await this.client.execute({
            sql: `SELECT id, conversationId, content, timestamp, actor FROM ${this.conversationsTableName} WHERE conversationId = ? LIMIT 1;`,
            args: [conversationId],
        });

        return results.rows.length > 0;
    }

    async deleteConversation(conversationId: string): Promise<void> {
        await this.client.execute(
            `DELETE FROM ${this.conversationsTableName} WHERE conversationId = '${conversationId}';`,
        );
    }

    async addEntryToConversation(conversationId: string, entry: Message): Promise<void> {
        if (entry.actor !== 'AI') {
            await this.client.execute({
                sql: `INSERT OR IGNORE INTO ${this.conversationsTableName} (id, conversationId, content, timestamp, actor)
                VALUES (?, ?, ?, ?, ?)`,
                args: [entry.id, conversationId, entry.content, entry.timestamp, entry.actor],
            });
        } else {
            await this.client.execute({
                sql: `INSERT OR IGNORE INTO ${this.conversationsTableName} (id, conversationId, content, timestamp, actor, sources)
                VALUES (?, ?, ?, ?, ?, ?)`,
                args: [
                    entry.id,
                    conversationId,
                    entry.content,
                    entry.timestamp,
                    entry.actor,
                    JSON.stringify(entry.sources),
                ],
            });
        }
    }

    async clearConversations(): Promise<void> {
        await this.client.execute(`DELETE FROM ${this.conversationsTableName};`);
    }

    async addConversation(_conversationId: string): Promise<void> {
        //There is nothing to be done for this in this libsql implementation
    }
}
