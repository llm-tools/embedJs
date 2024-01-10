export type LoaderMetadata<T> = T & { chunkId: number };
export type LoaderChunk<
    Meta extends Record<string, string | number | boolean> = Record<string, string | number | boolean>,
> = {
    pageContent: string;
    contentHash: string;
    metadata: LoaderMetadata<Meta>;
};

export type Metadata<T> = T & { id: string };
export type Chunk<Meta extends Record<string, string | number | boolean> = Record<string, string | number | boolean>> =
    {
        pageContent: string;
        metadata: Metadata<Meta>;
    };

export type EmbeddedChunk<
    Meta extends Record<string, string | number | boolean> = Record<string, string | number | boolean>,
> = {
    vector: number[];
    pageContent: string;
    metadata: Metadata<Meta>;
};
