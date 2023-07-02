import { Chunk } from '../global/types.js';

export abstract class BaseLoader<
    Meta extends Record<string, string | number | boolean> = Record<string, string | number | boolean>,
> {
    protected readonly uniqueId: string;

    constructor(uniqueId: string) {
        this.uniqueId = uniqueId;
    }

    abstract getChunks(): Promise<Chunk<Meta>[]>;
    getUniqueId(): string {
        return this.uniqueId;
    }
}
