import md5 from 'md5';

import { BaseLoader } from '../interfaces/base-loader.js';
import { cleanString } from '../global/utils.js';

export class JsonLoader extends BaseLoader<{ type: 'JSON'; chunkId: number; id: string }> {
    private readonly object: Record<string, unknown> | Record<string, unknown>[];
    private readonly pickKeysForEmbedding: string[];

    constructor({
        object,
        pickKeysForEmbedding,
    }: {
        object: Record<string, unknown> | Record<string, unknown>[];
        pickKeysForEmbedding: string[];
    }) {
        super(`JsonLoader_${md5(cleanString(JSON.stringify(object)))}`);

        this.pickKeysForEmbedding = pickKeysForEmbedding;
        this.object = object;
    }

    async getChunks() {
        const array = Array.isArray(this.object) ? this.object : [this.object];

        return array.map((entry, index) => {
            const subset = Object.fromEntries(
                this.pickKeysForEmbedding
                    .filter((key) => key in entry) // line can be removed to make it inclusive
                    .map((key) => [key, entry[key]]),
            );
            const string = cleanString(JSON.stringify(subset));

            if ('id' in entry) {
                entry.preEmbedId = entry.id;
                delete entry.id;
            }

            return {
                pageContent: string,
                metadata: {
                    type: <'JSON'>'JSON',
                    id: md5(string),
                    chunkId: index,
                    ...entry,
                },
            };
        });
    }
}
