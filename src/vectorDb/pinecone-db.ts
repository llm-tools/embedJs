import { Pinecone, PineconeRecord } from '@pinecone-database/pinecone';
import createDebugMessages from 'debug';

import { BaseDb } from '../interfaces/base-db.js';
import { Chunk, EmbeddedChunk } from '../global/types.js';
import { createArrayChunks, mapAsync } from '../util/arrays.js';

export class PineconeDb implements BaseDb {
    private readonly debug = createDebugMessages('embedjs:vector:PineconeDb');
    private static readonly PINECONE_INSERT_CHUNK_SIZE = 500;

    private readonly client: Pinecone;
    private readonly namespace: string;
    private readonly projectName: string;

    constructor({ projectName, namespace }: { projectName: string; namespace: string }) {
        this.client = new Pinecone({
            apiKey: process.env.PINECONE_API_KEY,
            environment: process.env.PINECONE_ENVIRONMENT,
        });
        this.projectName = projectName;
        this.namespace = namespace;
    }

    async init({ dimensions }: { dimensions: number }) {
        const list = (await this.client.listIndexes()).map((i) => i.name);
        if (list.indexOf(this.projectName) > -1) return;

        await this.client.createIndex({
            name: this.projectName,
            dimension: dimensions,
            metric: 'cosine',
        });
    }

    async insertChunks(chunks: EmbeddedChunk[]): Promise<number> {
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

    async similaritySearch(query: number[], k: number): Promise<Chunk[]> {
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

            return <Chunk>{
                pageContent,
                metadata: match.metadata,
            };
        });
    }

    async getVectorCount(): Promise<number> {
        const index = this.client.Index(this.projectName).namespace(this.namespace);
        return (await index.describeIndexStats()).totalRecordCount;
    }

    async deleteKeys(keys: string[]): Promise<void> {
        const index = await this.client.Index(this.projectName).namespace(this.namespace);
        const chunkedKeys = createArrayChunks(keys, 1000); //Pinecone only allows deleting 1000 chunks at a time
        await mapAsync(chunkedKeys, async (set) => index.deleteMany(set));
    }

    async reset(): Promise<void> {
        await this.client.Index(this.projectName).namespace(this.namespace).deleteAll();
    }
}
