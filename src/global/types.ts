export type LoaderMetadata<T> = T & { source: string };
export type LoaderChunk<
    Meta extends Record<string, string | number | boolean> = Record<string, string | number | boolean>,
> = {
    pageContent: string;
    contentHash: string;
    metadata: LoaderMetadata<Meta>;
};
export type UnfilteredLoaderChunk<
    Meta extends Record<string, string | number | boolean> = Record<string, string | number | boolean>,
> = {
    pageContent: string;
    metadata: LoaderMetadata<Meta>;
};

export type Metadata<T> = T & { id: string; uniqueLoaderId: string; source: string };
export type Chunk<Meta extends Record<string, string | number | boolean> = Record<string, string | number | boolean>> =
    {
        pageContent: string;
        metadata: Metadata<Meta>;
    };

export type InsertChunkData<
    Meta extends Record<string, string | number | boolean> = Record<string, string | number | boolean>,
> = {
    vector: number[];
    pageContent: string;
    metadata: Metadata<Meta>;
};

export type ExtractChunkData<
    Meta extends Record<string, string | number | boolean> = Record<string, string | number | boolean>,
> = {
    score: number;
    pageContent: string;
    metadata: Metadata<Meta>;
};

export type AddLoaderReturn = { entriesAdded: number; uniqueId: string };

export type ConversationHistory = {
    message: string;
    sender: 'HUMAN' | 'AI' | 'SYSTEM';
};
