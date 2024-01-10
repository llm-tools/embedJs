import * as fsOld from 'node:fs';
import * as fs from 'node:fs/promises';
import { Table, connect } from 'vectordb';

import { BaseDb } from '../interfaces/base-db.js';
import { Chunk, EmbeddedChunk } from '../global/types.js';

export class LanceDb implements BaseDb {
    private static STATIC_DB_NAME = 'vectors';
    private table: Table<number[]>;
    private isTemp: boolean = true;
    private path: string;

    constructor({ path, isTemp }: { path: string; isTemp?: boolean }) {
        this.isTemp = isTemp !== undefined ? isTemp : false;
        this.path = path;
    }

    async init({ dimensions }: { dimensions: number }) {
        if (!this.isTemp && !fsOld.existsSync(this.path)) {
            await fs.mkdir(this.path);
        }

        const dir = await (this.isTemp ? fs.mkdtemp(this.path) : this.path);
        const client = await connect(dir);

        const list = await client.tableNames();
        if (list.indexOf(LanceDb.STATIC_DB_NAME) > -1) this.table = await client.openTable(LanceDb.STATIC_DB_NAME);
        else {
            this.table = await client.createTable(LanceDb.STATIC_DB_NAME, [
                { id: 'md5', pageContent: 'sample', vector: Array(dimensions), metadata: 'json' },
            ]);
        }
    }

    async insertChunks(chunks: EmbeddedChunk[]): Promise<number> {
        const mapped = chunks.map((chunk) => {
            return {
                id: chunk.metadata.id,
                pageContent: chunk.pageContent,
                vector: chunk.vector,
                metadata: JSON.stringify(chunk.metadata),
            };
        });

        return this.table.add(mapped);
    }

    async similaritySearch(query: number[], k: number): Promise<Chunk[]> {
        const results = await this.table.search(query).limit(k).execute();

        return (
            results
                //a mandatory record is required by lance during init to get schema
                //and this record is also returned in results; we filter it out
                .filter((entry) => entry.id !== 'md5')
                .map((result) => {
                    const metadata = JSON.parse(<string>result.metadata);

                    return {
                        pageContent: <string>result.pageContent,
                        metadata,
                    };
                })
        );
    }

    async getVectorCount(): Promise<number> {
        return this.table.countRows();
    }

    async deleteKeys(keys: string[]): Promise<void> {
        await this.table.delete(`id IS IN (${keys.map((key) => `'${key}'`).join(',')})`);
    }

    async reset(): Promise<void> {
        await this.table.delete('id IS NOT NULL');
    }
}
