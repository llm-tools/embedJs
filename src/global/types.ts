export type Chunk<Meta extends Record<string, unknown> = Record<string, unknown>> = {
    pageContent: string;
    metadata: Meta & { id: string };
};

export type EmbeddedChunk<Meta extends Record<string, unknown> = Record<string, unknown>> = {
    vector: number[];
    pageContent: string;
    metadata: Meta & { id: string };
};
