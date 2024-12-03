export abstract class BaseEmbeddings {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    public async init(): Promise<void> {}

    public abstract embedDocuments(texts: string[]): Promise<number[][]>;
    public abstract embedQuery(text: string): Promise<number[]>;
    public abstract getDimensions(): Promise<number>;
}
