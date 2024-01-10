import { LoaderChunk } from '../global/types.js';

export abstract class BaseLoader<
    T extends Record<string, string | number | boolean> = Record<string, string | number | boolean>,
> {
    protected readonly uniqueId: string;

    constructor(uniqueId: string) {
        this.uniqueId = uniqueId;
    }

    abstract getChunks(): Promise<LoaderChunk<T>[]>;

    getUniqueId(): string {
        return this.uniqueId;
    }
}
