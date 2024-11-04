import { BaseLoader } from '@llm-tools/embedjs-interfaces';
import { cleanString, truncateCenterString } from '@llm-tools/embedjs-utils';
import md5 from 'md5';

export class JsonLoader extends BaseLoader<{ type: 'JsonLoader' }> {
    private readonly object: Record<string, unknown> | Record<string, unknown>[];
    private readonly pickKeysForEmbedding?: string[];

    constructor({
        object,
        pickKeysForEmbedding,
    }: {
        object: Record<string, unknown> | Record<string, unknown>[];
        pickKeysForEmbedding?: string[];
    }) {
        super(`JsonLoader_${md5(cleanString(JSON.stringify(object)))}`, {
            object: truncateCenterString(JSON.stringify(object), 50),
        });

        this.pickKeysForEmbedding = pickKeysForEmbedding;
        this.object = object;
    }

    override async *getUnfilteredChunks() {
        const tuncatedObjectString = truncateCenterString(JSON.stringify(this.object), 50);
        const array = Array.isArray(this.object) ? this.object : [this.object];

        for (const entry of array) {
            let s: string;
            if (this.pickKeysForEmbedding) {
                const subset = Object.fromEntries(
                    this.pickKeysForEmbedding
                        .filter((key) => key in entry) // line can be removed to make it inclusive
                        .map((key) => [key, entry[key]]),
                );
                s = cleanString(JSON.stringify(subset));
            } else {
                s = cleanString(JSON.stringify(entry));
            }

            if ('id' in entry) {
                entry.preEmbedId = entry.id;
                delete entry.id;
            }

            yield {
                pageContent: s,
                metadata: {
                    type: 'JsonLoader' as const,
                    source: tuncatedObjectString,
                },
            };
        }
    }
}
