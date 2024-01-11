import { Chunk } from '../global/types.js';

export abstract class BaseModel {
    protected readonly temperature: number;

    constructor(temperature: number) {
        this.temperature = temperature;
    }

    public async init(): Promise<void> {}

    public async query(prompt: string, supportingContext: Chunk[], resetChain: boolean = false): Promise<string> {
        if (resetChain) await this.resetContext();
        return this.runQuery(prompt, supportingContext);
    }

    protected abstract runQuery(prompt: string, supportingContext: Chunk[]): Promise<string>;
    public abstract resetContext(): Promise<void>;
}
