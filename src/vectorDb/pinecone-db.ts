import { CreateIndexRequestSpec } from '@pinecone-database/pinecone/dist/pinecone-generated-ts-fetch/index.js';
import { Pinecone, PineconeRecord } from '@pinecone-database/pinecone';
import createDebugMessages from 'debug';

import { BaseDb } from '../interfaces/base-db.js';
import { ExtractChunkData, InsertChunkData } from '../global/types.js';

export class PineconeDb implements BaseDb {
    private readonly debug = createDebugMessages('embedjs:vector:PineconeDb');
    private static readonly PINECONE_INSERT_CHUNK_SIZE = 200; //Pinecone only allows inserting 2MB worth of chunks at a time; this is an approximation

    private readonly client: Pinecone;
    private readonly namespace: string;
    private readonly projectName: string;
    private readonly indexSpec: CreateIndexRequestSpec;

    constructor({
        projectName,
        namespace,
        indexSpec,
    }: {
        projectName: string;
        namespace: string;
        indexSpec: CreateIndexRequestSpec;
    }) {
        this.client = new Pinecone();

        this.projectName = projectName;
        this.namespace = namespace;
        this.indexSpec = indexSpec;
    }

    async init({ dimensions }: { dimensions: number }) {
        const list = (await this.client.listIndexes()).indexes.map((i) => i.name);
        if (list.indexOf(this.projectName) > -1) return;

        await this.client.createIndex({
            name: this.projectName,
            dimension: dimensions,
            spec: this.indexSpec,
            metric: 'cosine',
        });
    }

    async insertChunks(chunks: InsertChunkData[]): Promise<number> {
        let processed = 0;
        const index = this.client.Index(this.projectName).namespace(this.namespace);

        for (let i = 0; i < chunks.length; i += PineconeDb.PINECONE_INSERT_CHUNK_SIZE) {
            const chunkBatch = chunks.slice(i, i + PineconeDb.PINECONE_INSERT_CHUNK_SIZE);

            const upsertCommand: PineconeRecord[] = chunkBatch.map((chunk) => {
                return {
                    id: chunk.metadata.id,
                    values: chunk.vector,
                    metadata: { pageContent: chunk.pageContent, ...chunk.metadata },
                };
            });

            this.debug(`Inserting Pinecone batch`);
            await index.upsert(upsertCommand);
            processed += chunkBatch.length;
        }

        return processed;
    }

    async similaritySearch(query: number[], k: number): Promise<ExtractChunkData[]> {
        const index = this.client.Index(this.projectName).namespace(this.namespace);
        const queryResponse = await index.query({
            topK: k,
            vector: query,
            includeMetadata: true,
            includeValues: true,
        });

        return queryResponse.matches.map((match) => {
            const pageContent = (<any>match.metadata).pageContent;
            delete (<any>match.metadata).pageContent;

            return <ExtractChunkData>{
                score: match.score,
                pageContent,
                metadata: match.metadata,
            };
        });
    }

    async getVectorCount(): Promise<number> {
        const index = this.client.Index(this.projectName).namespace(this.namespace);
        return (await index.describeIndexStats()).totalRecordCount;
    }

    async deleteKeys(uniqueLoaderId: string): Promise<boolean> {
        const index = await this.client.Index(this.projectName).namespace(this.namespace);

        try {
            await index.deleteMany({ uniqueLoaderId: { $eq: uniqueLoaderId } });
            return true;
        } catch (e) {
            this.debug(
                `Failed to delete keys for loader '${uniqueLoaderId}'. 
Pinecone does not allow deleting by metadata filtering in serverless and free (what they call starter) instances`,
            );
            return false;
        }
    }

    async reset(): Promise<void> {
        await this.client.Index(this.projectName).namespace(this.namespace).deleteAll();
    }
}
