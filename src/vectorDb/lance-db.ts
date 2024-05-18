import * as fsOld from 'node:fs';
import * as fs from 'node:fs/promises';
import { Table, connect } from 'vectordb';
import similarity from 'compute-cosine-similarity';

import { BaseDb } from '../interfaces/base-db.js';
import { ExtractChunkData, InsertChunkData } from '../global/types.js';

export class LanceDb implements BaseDb {
    private static readonly STATIC_DB_NAME = 'vectors';
    private readonly isTemp: boolean = true;
    private readonly path: string;
    private table: Table<number[]>;

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
            //TODO: You can add a proper schema instead of a sample record now but it requires another package apache-arrow; another install on downstream as well
            this.table = await client.createTable(LanceDb.STATIC_DB_NAME, [
                {
                    id: 'md5',
                    pageContent: 'sample',
                    vector: Array(dimensions),
                    uniqueLoaderId: 'sample',
                    vectorString: 'sample',
                    metadata: 'sample',
                },
            ]);
        }
    }

    async insertChunks(chunks: InsertChunkData[]): Promise<number> {
        const mapped = chunks.map((chunk) => {
            const uniqueLoaderId = chunk.metadata.uniqueLoaderId;
            delete chunk.metadata.uniqueLoaderId;

            return {
                id: chunk.metadata.id,
                pageContent: chunk.pageContent,
                vector: chunk.vector,
                uniqueLoaderId,
                metadata: JSON.stringify(chunk.metadata),
                vectorString: JSON.stringify(chunk.vector),
            };
        });

        await this.table.add(mapped);
        return mapped.length; //TODO: check if vectorDb has addressed the issue where add returns undefined
    }

    async similaritySearch(query: number[], k: number): Promise<ExtractChunkData[]> {
        const results = await this.table.search(query).limit(k).execute();

        return (
            results
                //TODO: a mandatory record is used and this record is also returned in results; we filter it out
                .filter((entry) => entry.id !== 'md5')
                .map((result) => {
                    const metadata = JSON.parse(<string>result.metadata);
                    const vector = JSON.parse(<string>result.vectorString);
                    metadata.uniqueLoaderId = result.uniqueLoaderId;

                    return {
                        score: similarity(query, vector),
                        pageContent: <string>result.pageContent,
                        metadata,
                    };
                })
        );
    }

    async getVectorCount(): Promise<number> {
        return this.table.countRows();
    }

    async deleteKeys(uniqueLoaderId: string): Promise<boolean> {
        await this.table.delete(`\`uniqueLoaderId\` = "${uniqueLoaderId}"`);
        return true;
    }

    async reset(): Promise<void> {
        await this.table.delete('id IS NOT NULL');
    }
}
