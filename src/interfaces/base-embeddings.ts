export interface BaseEmbeddings {
    embedDocuments(texts: string[]): Promise<number[][]>;
    embedQuery(text: string): Promise<number[]>;
    getDimensions(): number;
}
