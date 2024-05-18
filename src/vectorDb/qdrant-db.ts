import { QdrantClient } from '@qdrant/js-client-rest';
import createDebugMessages from 'debug';
import { v4 as uuid } from 'uuid';

import { BaseDb } from '../interfaces/base-db.js';
import { ExtractChunkData, InsertChunkData } from '../global/types.js';

export class QdrantDb implements BaseDb {
    private readonly debug = createDebugMessages('embedjs:vector:QdrantDb');
    private static readonly QDRANT_INSERT_CHUNK_SIZE = 500;

    private readonly client: QdrantClient;
    private readonly clusterName: string;

    constructor({ apiKey, url, clusterName }: { apiKey: string; url: string; clusterName: string }) {
        this.client = new QdrantClient({ apiKey, url });
        this.clusterName = clusterName;
    }

    async init({ dimensions }: { dimensions: number }) {
        const list = (await this.client.getCollections()).collections.map((c) => c.name);
        if (list.indexOf(this.clusterName) > -1) return;

        await this.client.createCollection(this.clusterName, {
            vectors: {
                size: dimensions,
                distance: 'Cosine',
            },
        });

        await this.client.createPayloadIndex(this.clusterName, {
            wait: true,
            field_name: 'uniqueLoaderId',
            field_schema: 'text',
            ordering: 'weak',
        });
    }

    async insertChunks(chunks: InsertChunkData[]): Promise<number> {
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

            this.debug(`Inserting QDrant batch`);
            await this.client.upsert(this.clusterName, {
                wait: true,
                points: upsertCommand,
            });
            processed += chunkBatch.length;
        }

        return processed;
    }

    async similaritySearch(query: number[], k: number): Promise<ExtractChunkData[]> {
        const queryResponse = await this.client.search(this.clusterName, {
            limit: k,
            vector: query,
            with_payload: true,
        });

        return queryResponse.map((match) => {
            const pageContent = (<any>match.payload).pageContent;
            delete (<any>match.payload).pageContent;

            return <ExtractChunkData>{
                score: match.score,
                pageContent,
                metadata: match.payload,
            };
        });
    }

    async getVectorCount(): Promise<number> {
        return (await this.client.getCollection(this.clusterName)).points_count;
    }

    async deleteKeys(uniqueLoaderId: string): Promise<boolean> {
        await this.client.delete(this.clusterName, {
            wait: true,
            filter: {
                must: [
                    {
                        key: 'uniqueLoaderId',
                        match: {
                            value: uniqueLoaderId,
                        },
                    },
                ],
            },
        });
        return true;
    }

    async reset(): Promise<void> {
        await this.client.delete(this.clusterName, {
            filter: {},
        });
    }
}
