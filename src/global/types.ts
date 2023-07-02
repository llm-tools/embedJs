export type Chunk<Meta extends Record<string, string | number | boolean> = Record<string, string | number | boolean>> =
    {
        pageContent: string;
        metadata: Meta & { id: string };
    };

export type EmbeddedChunk<
    Meta extends Record<string, string | number | boolean> = Record<string, string | number | boolean>,
> = {
    vector: number[];
    pageContent: string;
    metadata: Meta & { id: string };
};
