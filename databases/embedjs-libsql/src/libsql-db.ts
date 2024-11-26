import createDebugMessages from 'debug';
import { Client, createClient } from '@libsql/client';

import { BaseVectorDatabase, ExtractChunkData, InsertChunkData } from '@llm-tools/embedjs-interfaces';

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
        await this.client.execute(`CREATE TABLE ${this.tableName} (
            id              TEXT
            pageContent     TEXT,
            uniqueLoaderId  TEXT,
            source          TEXT,
            vector          F32_BLOB(${dimensions}),
            metadata        TEXT
        );`);
    }

    async insertChunks(chunks: InsertChunkData[]): Promise<number> {
        const values = chunks.map((chunk) => {
            return `('${chunk.metadata.id}', '${chunk.pageContent}', '${chunk.metadata.uniqueLoaderId}', 
                '${chunk.metadata.source}', vector32('[${chunk.vector.join(',')}]'),
                '${JSON.stringify(chunk.metadata)}')`;
        });

        const statement = `INSERT INTO ${this.tableName} (id, pageContent, uniqueLoaderId, source, vector, metadata)
            VALUES
            ${values.join(',')}
        );`;

        this.debug.log(`Executing statement - ${statement}`);
        const result = await this.client.execute(statement);
        return result.rowsAffected;
    }

    async similaritySearch(query: number[], k: number): Promise<ExtractChunkData[]> {
        const statement = `SELECT id, pageContent, uniqueLoaderId, source, metadata,
                vector_distance_cos(vector, vector32('[${query.join(',')}]'))
            FROM ${this.tableName}
            ORDER BY vector_distance_cos(vector, vector32('[${query.join(',')}]'))
            TOP ${k}
            ASC;`;

        this.debug.log(`Executing statement - ${statement}`);
        const results = await this.client.execute(statement);

        return results.rows.map((result) => {
            const metadata = JSON.parse(<string>result.metadata.toString());

            return {
                metadata,
                pageContent: result.pageContent.toString(),
                score: 1,
            };
        });
    }

    async getVectorCount(): Promise<number> {
        return 0;
    }

    async deleteKeys(uniqueLoaderId: string): Promise<boolean> {
        const statement = `DELETE FROM ${this.tableName} VALUES WHERE
           uniqueLoaderId = '${uniqueLoaderId}';`;

        await this.client.execute(statement);
        return true;
    }

    async reset(): Promise<void> {}
}
