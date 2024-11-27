import createDebugMessages from 'debug';
import { Client, createClient } from '@libsql/client';

import { BaseVectorDatabase, ExtractChunkData, InsertChunkData } from '@llm-tools/embedjs-interfaces';
import { truncateCenterString } from '@llm-tools/embedjs-utils';

export class LibSqlDb implements BaseVectorDatabase {
    private readonly debug = createDebugMessages('embedjs:vector:LibSqlDb');
    private readonly tableName: string;
    private readonly client: Client;

    constructor({ path, tableName }: { path: string; tableName?: string }) {
        this.tableName = tableName ?? 'vectors';
        this.client = createClient({
            url: `file:${path}`,
        });
    }

    async init({ dimensions }: { dimensions: number }) {
        await this.client.execute(`CREATE TABLE IF NOT EXISTS ${this.tableName} (
            id              TEXT PRIMARY KEY,
            pageContent     TEXT UNIQUE,
            uniqueLoaderId  TEXT NOT NULL,
            source          TEXT NOT NULL,
            vector          F32_BLOB(${dimensions}),
            metadata        TEXT
        );`);
    }

    async insertChunks(chunks: InsertChunkData[]): Promise<number> {
        const batch = chunks.map((chunk) => {
            return {
                sql: `INSERT OR IGNORE INTO ${this.tableName} (id, pageContent, uniqueLoaderId, source, vector, metadata)
            VALUES (?, ?, ?, ?, vector32('[${chunk.vector.join(',')}]'), ?);`,
                args: [
                    chunk.metadata.id,
                    chunk.pageContent,
                    chunk.metadata.uniqueLoaderId,
                    chunk.metadata.source,
                    JSON.stringify(chunk.metadata),
                ],
            };
        });

        this.debug(`Executing batch - ${truncateCenterString(JSON.stringify(batch), 1000)}`);
        const result = await this.client.batch(batch, 'write');
        return result.reduce((a, b) => a + b.rowsAffected, 0);
    }

    async similaritySearch(query: number[], k: number): Promise<ExtractChunkData[]> {
        const statement = `SELECT id, pageContent, uniqueLoaderId, source, metadata,
                vector_distance_cos(vector, vector32('[${query.join(',')}]'))
            FROM ${this.tableName}
            ORDER BY vector_distance_cos(vector, vector32('[${query.join(',')}]')) ASC
            LIMIT ${k};`;

        this.debug(`Executing statement - ${truncateCenterString(statement, 700)}`);
        const results = await this.client.execute(statement);

        return results.rows.map((result) => {
            const metadata = JSON.parse(result.metadata.toString());

            return {
                metadata,
                pageContent: result.pageContent.toString(),
                score: 1,
            };
        });
    }

    async getVectorCount(): Promise<number> {
        const statement = `SELECT count(id) as count FROM ${this.tableName};`;

        this.debug(`Executing statement - ${statement}`);
        const results = await this.client.execute(statement);

        return Number.parseInt(results.rows[0].count.toString());
    }

    async deleteKeys(uniqueLoaderId: string): Promise<boolean> {
        await this.client.execute(`DELETE FROM ${this.tableName} WHERE
           uniqueLoaderId = '${uniqueLoaderId}';`);
        return true;
    }

    async reset(): Promise<void> {
        await this.client.execute(`DELETE FROM ${this.tableName};`);
    }
}
