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

export type AddLoaderReturn = { entriesAdded: number; uniqueId: string; loaderType: string };

export type EntryMessage = {
    sender: 'HUMAN' | 'AI' | 'SYSTEM';
    message: string
}

export type LoaderList = {
    type: string;
    uniqueId: string;
    loaderMetadata: Record<string, unknown>;
}[];

export type Conversation = {
    conversationId: string;
    entries: ConversationEntry[];
}

export type ConversationEntry = {
    _id: string;
    timestamp: Date;
    content: EntryMessage;
    sources: Sources[]
}

export type Sources = {
    source: string;
    loaderId: string
}