import { Chunk } from '../global/types.js';

export interface BaseLoader<Meta extends Record<string, unknown> = Record<string, unknown>> {
    getChunks(): Promise<Chunk<Meta>[]>;
}
