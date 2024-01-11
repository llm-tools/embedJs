import md5 from 'md5';

import { BaseLoader } from '../interfaces/base-loader.js';
import { cleanString } from '../global/utils.js';

export class JsonLoader extends BaseLoader<{ type: 'JsonLoader'; chunkId: number }> {
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

    async *getChunks() {
        const array = Array.isArray(this.object) ? this.object : [this.object];

        let i = 0;
        for(const entry of array) {
            const subset = Object.fromEntries(
                this.pickKeysForEmbedding
                    .filter((key) => key in entry) // line can be removed to make it inclusive
                    .map((key) => [key, entry[key]]),
            );
            const s = cleanString(JSON.stringify(subset));

            if ('id' in entry) {
                entry.preEmbedId = entry.id;
                delete entry.id;
            }

            yield {
                pageContent: s,
                contentHash: md5(s),
                metadata: {
                    type: <'JsonLoader'>'JsonLoader',
                    chunkId: i,
                    ...entry,
                },
            };

            i++;
        }
    }
}
