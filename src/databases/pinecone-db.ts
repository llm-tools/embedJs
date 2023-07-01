import { PineconeClient } from '@pinecone-database/pinecone';
import { BaseDb } from '../interfaces/base-db.js';
import { Chunk, EmbeddedChunk } from '../global/types.js';
import { UpsertOperationRequest } from '@pinecone-database/pinecone/dist/pinecone-generated-ts-fetch/index.js';

export class PineconeDb implements BaseDb {
    private namespace: string;
    private projectName: string;
    private client: PineconeClient;

    constructor({ projectName, namespace }: { projectName: string; namespace: string }) {
        this.client = new PineconeClient();
        this.projectName = projectName;
        this.namespace = namespace;
    }
    async init() {
        await this.client.init({
            apiKey: process.env.PINECONE_API_KEY,
            environment: process.env.PINECONE_ENVIRONMENT,
        });

        const list = await this.client.listIndexes();
        if (list.indexOf(this.projectName) > -1) return;

        await this.client.createIndex({
            createRequest: {
                name: this.projectName,
                dimension: 1536,
            },
        });
    }

    async insertChunks(chunks: EmbeddedChunk[]): Promise<number> {
        let processed = 0;
        const chunkSize = 300;
        //Pinecone allows a maximum of 1000 entries and total 2MB per upsert
        //2MB is hard to predict right, batch size of 300 is arbitary but should be mostly under 300

        for (let i = 0; i < chunks.length; i += chunkSize) {
            const chunkBatch = chunks.slice(i, i + chunkSize);

            const upsertCommand: UpsertOperationRequest = {
                upsertRequest: {
                    vectors: chunkBatch.map((chunk) => {
                        return {
                            id: chunk.metadata.id,
                            values: chunk.vector,
                            metadata: { pageContent: chunk.pageContent, ...chunk.metadata },
                        };
                    }),
                    namespace: this.namespace,
                },
            };

            const index = this.client.Index(this.projectName);
            processed += (await index.upsert(upsertCommand)).upsertedCount;
        }

        return processed;
    }

    async similaritySearch(query: number[], k: number): Promise<Chunk[]> {
        const index = this.client.Index(this.projectName);
        const queryResponse = await index.query({
            queryRequest: {
                topK: k,
                vector: query,
                namespace: this.namespace,
                includeMetadata: true,
                includeValues: true,
            },
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
}
