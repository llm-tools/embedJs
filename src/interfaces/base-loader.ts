import { Chunk } from '../global/types.js';

export abstract class BaseLoader<Meta extends Record<string, unknown> = Record<string, unknown>> {
    protected readonly uniqueId: string;

    constructor(uniqueId: string) {
        this.uniqueId = uniqueId;
    }

    abstract getChunks(): Promise<Chunk<Meta>[]>;
    getUniqueId(): string {
        return this.uniqueId;
    }
}
