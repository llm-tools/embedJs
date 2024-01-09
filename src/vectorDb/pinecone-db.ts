import { Pinecone, PineconeRecord } from '@pinecone-database/pinecone';

import { BaseDb } from '../interfaces/base-db.js';
import { Chunk, EmbeddedChunk } from '../global/types.js';

export class PineconeDb implements BaseDb {
    private namespace: string;
    private projectName: string;
    private client: Pinecone;

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
        });
    }

    async insertChunks(chunks: EmbeddedChunk[]): Promise<number> {
        let processed = 0;
        const chunkSize = 300;
        const index = this.client.Index(this.projectName).namespace(this.namespace);

        for (let i = 0; i < chunks.length; i += chunkSize) {
            const chunkBatch = chunks.slice(i, i + chunkSize);

            const upsertCommand: PineconeRecord[] = chunkBatch.map((chunk) => {
                return {
                    id: chunk.metadata.id,
                    values: chunk.vector,
                    metadata: { pageContent: chunk.pageContent, ...chunk.metadata },
                };
            });

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

    async reset(): Promise<void> {
        return this.client.Index(this.projectName).namespace(this.namespace).deleteAll();
    }
}
