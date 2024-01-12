import { QdrantClient } from '@qdrant/js-client-rest';
import createDebugMessages from 'debug';
import { v4 as uuid } from 'uuid';

import { BaseDb } from '../interfaces/base-db.js';
import { Chunk, EmbeddedChunk } from '../global/types.js';

export class QdrantDb implements BaseDb {
    private readonly debug = createDebugMessages('embedjs:vector:QdrantDb');
    private static readonly QDRANT_INSERT_CHUNK_SIZE = 500;

    private readonly client: QdrantClient;
    private readonly projectName: string;

    constructor({ url, projectName }: { url: string; projectName: string }) {
        this.client = new QdrantClient({
            apiKey: process.env.QDRANT_API_KEY,
            url,
        });

        this.projectName = projectName;
    }

    async init({ dimensions }: { dimensions: number }) {
        const list = (await this.client.getCollections()).collections.map((c) => c.name);
        if (list.indexOf(this.projectName) > -1) return;

        await this.client.createCollection(this.projectName, {
            vectors: {
                size: dimensions,
                distance: 'Cosine',
            },
        });

        await this.client.createPayloadIndex(this.projectName, {
            wait: true,
            field_name: 'id',
            field_schema: 'text',
            ordering: 'weak',
        });
    }

    async insertChunks(chunks: EmbeddedChunk[]): Promise<number> {
        let processed = 0;

        for (let i = 0; i < chunks.length; i += QdrantDb.QDRANT_INSERT_CHUNK_SIZE) {
            const chunkBatch = chunks.slice(i, i + QdrantDb.QDRANT_INSERT_CHUNK_SIZE);

            const upsertCommand = chunkBatch.map((chunk) => {
                return {
                    id: uuid(),
                    vector: chunk.vector,
                    payload: { pageContent: chunk.pageContent, ...chunk.metadata },
                };
            });
            console.log(upsertCommand);

            this.debug(`Inserting QDrant batch`);
            await this.client.upsert(this.projectName, {
                wait: true,
                points: upsertCommand,
            });
            processed += chunkBatch.length;
        }

        return processed;
    }

    async similaritySearch(query: number[], k: number): Promise<Chunk[]> {
        const queryResponse = await this.client.search(this.projectName, {
            limit: k,
            vector: query,
            with_payload: true,
        });

        return queryResponse.map((match) => {
            const pageContent = (<any>match.payload).pageContent;
            delete (<any>match.payload).pageContent;

            return <Chunk>{
                pageContent,
                metadata: match.payload,
            };
        });
    }

    async getVectorCount(): Promise<number> {
        return (await this.client.getCollection(this.projectName)).points_count;
    }

    async deleteKeys(keys: string[]): Promise<void> {
        await this.client.delete(this.projectName, {
            wait: true,
            points: keys,
        });
    }

    async reset(): Promise<void> {
        await this.client.delete(this.projectName, {
            filter: {},
        });
    }
}
