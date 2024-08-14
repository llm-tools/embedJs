import { Collection, MongoClient } from 'mongodb';
import createDebugMessages from 'debug';

import { BaseDb } from '../interfaces/base-db.js';
import { ExtractChunkData, InsertChunkData } from '../global/types.js';

export class MongoDb implements BaseDb {
    private readonly debug = createDebugMessages('embedjs:vector:MongoDb');

    private static readonly DEFAULT_DB_NAME = 'embedjs';
    private static readonly COLLECTION_NAME = 'vectors';
    private static readonly VECTOR_FIELD_NAME = 'v_fld';
    private static readonly LOADER_FIELD_NAME = 'l_fld';
    private static readonly UNIQUE_FIELD_NAME = 'u_fld';
    private static readonly INDEX_PREFIX = 'index_';

    private readonly client: MongoClient;
    private readonly dbName: string;

    private collection: Collection;
    private readonly collectionName: string;

    constructor({
        connectionString,
        dbName,
        collectionName,
    }: {
        connectionString: string;
        dbName?: string;
        collectionName?: string;
    }) {
        this.collectionName = collectionName ?? MongoDb.COLLECTION_NAME;
        this.dbName = dbName ?? MongoDb.DEFAULT_DB_NAME;
        this.client = new MongoClient(connectionString);
    }

    private getIndexName(indexName: string) {
        return MongoDb.INDEX_PREFIX + indexName;
    }

    async init({ dimensions }: { dimensions: number }) {
        this.debug('Connecting to database');
        await this.client.connect();
        const database = this.client.db(this.dbName);
        this.debug('Connected');

        const collections = await database.collections({ nameOnly: true, authorizedCollections: true });
        if (!collections.some((x) => x.collectionName === this.collectionName)) {
            this.debug(`Creating collection '${this.collectionName}'`);
            await database.createCollection(this.collectionName);
        }
        this.collection = database.collection(this.collectionName);
        this.debug('Collection reference obtained');

        const vectorIndexName = this.getIndexName(MongoDb.VECTOR_FIELD_NAME);
        if ((await this.collection.listSearchIndexes(vectorIndexName).toArray()).length === 0) {
            this.debug(`Creating vector search index '${vectorIndexName}'`);
            await this.collection.createSearchIndex({
                name: vectorIndexName,
                type: 'vectorSearch',
                definition: {
                    fields: [
                        {
                            type: 'vector',
                            numDimensions: dimensions,
                            path: MongoDb.VECTOR_FIELD_NAME,
                            similarity: 'cosine',
                        },
                    ],
                },
            });
        }

        const loaderIndexName = this.getIndexName(MongoDb.LOADER_FIELD_NAME);
        if (
            !(
                (
                    (await this.collection.indexExists(loaderIndexName)) ||
                    (await this.collection.indexExists(`${loaderIndexName}_1`))
                ) //MongoDB atlas sometimes appends _1 to index names
            )
        ) {
            this.debug(`Creating unique loader index '${loaderIndexName}'`);
            await this.collection.createIndex({ [loaderIndexName]: 1 });
        }

        this.debug('All indexes created / exist already');
    }

    async insertChunks(chunks: InsertChunkData[]): Promise<number> {
        this.debug(`Inserting ${chunks.length} chunks`);
        const insertResult = await this.collection.insertMany(
            chunks.map((chunk) => {
                const metadata = chunk.metadata;

                const uniqueLoaderId = metadata.uniqueLoaderId;
                delete metadata.uniqueLoaderId;

                const source = metadata.source;
                delete metadata.source;

                const id = metadata.id;
                delete metadata.id;

                return {
                    [MongoDb.UNIQUE_FIELD_NAME]: id,
                    [MongoDb.VECTOR_FIELD_NAME]: chunk.vector,
                    [MongoDb.LOADER_FIELD_NAME]: uniqueLoaderId,
                    pageContent: chunk.pageContent,
                    source: source,
                    metadata,
                };
            }),
        );

        return insertResult.insertedCount;
    }

    async similaritySearch(query: number[], k: number): Promise<ExtractChunkData[]> {
        this.debug(`Searching with query dimension ${query.length}`);
        return (
            await this.collection
                .aggregate([
                    {
                        $vectorSearch: {
                            index: this.getIndexName(MongoDb.VECTOR_FIELD_NAME),
                            path: MongoDb.VECTOR_FIELD_NAME,
                            numCandidates: 25 * k,
                            queryVector: query,
                            limit: k,
                        },
                    },
                    {
                        $project: {
                            _id: 0,
                            source: 1,
                            metadata: 1,
                            pageContent: 1,
                            [MongoDb.UNIQUE_FIELD_NAME]: 1,
                            [MongoDb.LOADER_FIELD_NAME]: 1,
                            score: {
                                $meta: 'vectorSearchScore',
                            },
                        },
                    },
                ])
                .toArray()
        ).map((row) => {
            return {
                score: row.score,
                pageContent: row.pageContent,
                metadata: {
                    ...row.metadata,
                    source: row.source,
                    id: row[MongoDb.UNIQUE_FIELD_NAME],
                    uniqueLoaderId: row[MongoDb.LOADER_FIELD_NAME],
                },
            };
        });
    }

    async getVectorCount(): Promise<number> {
        return this.collection.countDocuments();
    }

    async deleteKeys(uniqueLoaderId: string): Promise<boolean> {
        this.debug(`Deleting keys tied to loader '${uniqueLoaderId}'`);
        const result = await this.collection.deleteMany({ [MongoDb.LOADER_FIELD_NAME]: uniqueLoaderId });
        return !!result.deletedCount;
    }

    async reset(): Promise<void> {
        await this.collection.deleteMany({});
    }
}