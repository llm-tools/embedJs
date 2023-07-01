export type Chunk<Meta extends Record<string, unknown> = any> = {
    pageContent: string;
    metadata: { id: string } & Meta;
};

export type EmbeddedChunk<Meta extends Record<string, unknown> = any> = {
    pageContent: string;
    vector: number[];
    metadata: { id: string } & Meta;
};
