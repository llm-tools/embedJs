import { CosmosClient, CosmosClientOptions, Container } from '@azure/cosmos';
import createDebugMessages from 'debug';

import { BaseDb } from '../interfaces/base-db.js';
import { ExtractChunkData, InsertChunkData } from '../global/types.js';

export class CosmosDb implements BaseDb {
    private readonly debug = createDebugMessages('embedjs:vector:CosmosDb');

    private static readonly DEFAULT_DB_NAME = 'embedjs';
    private static readonly CONTAINER_NAME = 'vectors';

    private static readonly VECTOR_FIELD_NAME = 'v_fld';
    private static readonly LOADER_FIELD_NAME = 'l_fld';

    private readonly client: CosmosClient;
    private readonly dbName: string;

    private container: Container;
    private readonly containerName: string;

    constructor({
        dbName,
        containerName,
        cosmosClientOptions,
    }: {
        dbName?: string;
        containerName?: string;
        cosmosClientOptions: CosmosClientOptions;
    }) {
        this.containerName = containerName ?? CosmosDb.CONTAINER_NAME;
        this.dbName = dbName ?? CosmosDb.DEFAULT_DB_NAME;
        this.client = new CosmosClient(cosmosClientOptions);
    }

    async init({ dimensions }: { dimensions: number }) {
        this.debug('Connecting to database');
        const { database } = await this.client.databases.createIfNotExists({ id: this.dbName });
        this.debug('Connected');

        const { container } = await database.containers.createIfNotExists(<any>{
            //Have to use tyepcast any because lib not updated to support indexingPolicy or vectorEmbeddingPolicy
            id: this.containerName,
            partitionKey: {
                paths: [`/${CosmosDb.LOADER_FIELD_NAME}`],
                version: 2,
            },
            vectorEmbeddingPolicy: {
                vectorEmbeddings: [
                    {
                        path: `/${CosmosDb.VECTOR_FIELD_NAME}`,
                        distanceFunction: 'cosine',
                        dataType: 'float32',
                        dimensions,
                    },
                ],
            },
            indexingPolicy: {
                automatic: true,
                indexingMode: 'consistent',
                vectorIndexes: [
                    {
                        path: `/${CosmosDb.VECTOR_FIELD_NAME}`,
                        type: 'quantizedFlat',
                    },
                ],
            },
        });
        this.debug('Container reference obtained');
        this.container = container;
    }

    async insertChunks(chunks: InsertChunkData[]): Promise<number> {
        this.debug(`Inserting ${chunks.length} chunks`);

        const response = await this.container.items.bulk(
            chunks.map((chunk) => {
                const uniqueLoaderId = chunk.metadata.uniqueLoaderId;
                delete chunk.metadata.uniqueLoaderId;

                const uniqueId = chunk.metadata.id;
                delete chunk.metadata.id;

                return {
                    operationType: 'Create',
                    resourceBody: {
                        id: uniqueId,
                        [CosmosDb.VECTOR_FIELD_NAME]: chunk.vector,
                        [CosmosDb.LOADER_FIELD_NAME]: uniqueLoaderId,
                        pageContent: chunk.pageContent,
                        metadata: chunk.metadata,
                    },
                };
            }),
        );

        return response.length;
    }

    async similaritySearch(query: number[], k: number): Promise<ExtractChunkData[]> {
        this.debug(`Searching with query dimension ${query.length}`);
        const encodedQuery = query.join(',');

        const queryResponse = await this.container.items
            .query(
                `SELECT c.id, c.${CosmosDb.LOADER_FIELD_NAME}, c.pageContent, c.metadata,
                VectorDistance(c.${CosmosDb.VECTOR_FIELD_NAME}, [${encodedQuery}]) AS score
                FROM c
                ORDER BY VectorDistance(c.${CosmosDb.VECTOR_FIELD_NAME}, [${encodedQuery}]) 
                OFFSET 0 LIMIT ${k}`,
                { forceQueryPlan: true, maxItemCount: k },
            )
            // This ORDER BY part is necessary to enable the correct content to be available.
            // TODO: but unfortunately the Cosmos node library has poor support for vector data and this query is not supported
            // The documentation provides a workaround that they have forgotten to actually include in the lib; it shows TS errors
            // Current implementation is expensive to run but since there is no real support for vector search in NodeJs library, this will have to do
            .fetchAll();

        return queryResponse.resources.map((entry) => {
            return {
                score: entry.score,
                pageContent: entry.pageContent,
                metadata: {
                    ...entry.metadata,
                    uniqueLoaderId: entry[CosmosDb.LOADER_FIELD_NAME],
                    id: entry.id,
                },
            };
        });
    }

    async getVectorCount(): Promise<number> {
        this.debug('Getting count of chunks in store');
        const largeQueryResponse = await this.container.items
            .query('SELECT VALUE COUNT(1) FROM c', { maxItemCount: -1, forceQueryPlan: true })
            .fetchAll(); //This is bad for performance; unfortunately Cosmos offers no solution to get count atm

        const count = largeQueryResponse.resources[0] ?? 0;
        this.debug(`Found '${count}' entries`);
        return count;
    }

    private async bulkDeleteValues(IDs: string[]) {
        const response = await this.container.items.bulk(
            IDs.map((id) => {
                return {
                    operationType: 'Delete',
                    id,
                };
            }),
        );

        return response.length;
    }

    private async bulkDeleteValuesByBatch(IDs: string[]) {
        let batchNumber = 0,
            totalDeletes = 0,
            batch: string[] = [];
        this.debug(`Total entries to delete '${IDs.length}'`);

        for (let i = 1; i <= IDs.length; i++) {
            if (i % 100 === 0) {
                batchNumber++;
                this.debug(`Sending batch delete command number '${batchNumber}'`);

                totalDeletes += await this.bulkDeleteValues(batch);
                batch = [];
            } else batch.push(IDs[i]);
        }

        if (batch.length != 0) {
            batchNumber++;
            this.debug(`Sending batch delete command number '${batchNumber}'`);
            totalDeletes += await this.bulkDeleteValues(batch);
        }

        return totalDeletes;
    }

    async deleteKeys(uniqueLoaderId: string): Promise<boolean> {
        this.debug(`Starting delete for keys tied to loader '${uniqueLoaderId}'`);

        const queryResponse = await this.container.items
            .query(`SELECT c.id FROM c WHERE c.${CosmosDb.LOADER_FIELD_NAME} = '${uniqueLoaderId}'`, {
                forceQueryPlan: true,
            })
            .fetchAll();
        const IDs = queryResponse.resources.map<string>((x) => x.id);

        if (IDs.length > 0) {
            this.debug('Something to delete indeed');
            const deleteCount = await this.bulkDeleteValuesByBatch(IDs);
            return deleteCount > 0;
        } else {
            this.debug('Nothing to delete');
            return true;
        }
    }

    async reset(): Promise<void> {
        this.debug('Starting reset');

        const queryResponse = await this.container.items
            .query(`SELECT c.id FROM c`, { forceQueryPlan: true })
            .fetchAll();
        const IDs = queryResponse.resources.map<string>((x) => x.id);

        if (IDs.length > 0) {
            this.debug('Something to delete indeed');
            await this.bulkDeleteValuesByBatch(IDs);
        } else this.debug('Nothing to delete');
    }
}
