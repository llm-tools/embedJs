import createDebugMessages from 'debug';
import { LoaderChunk } from '../global/types.js';

export abstract class BaseLoader<
    T extends Record<string, string | number | boolean> = Record<string, string | number | boolean>,
> {
    protected readonly uniqueId: string;

    constructor(uniqueId: string) {
        this.uniqueId = uniqueId;
        createDebugMessages('embedjs:loader:BaseLoader')(`New loader class initalized with key ${uniqueId}`);
    }

    async init() {}

    getUniqueId(): string {
        return this.uniqueId;
    }

    abstract getChunks(): AsyncGenerator<LoaderChunk<T>, void, void>;
}
