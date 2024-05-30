import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import md5 from 'md5';

import { BaseLoader } from '../interfaces/base-loader.js';
import { cleanString, truncateCenterString } from '../util/strings.js';

export class TextLoader extends BaseLoader<{ type: 'TextLoader' }> {
    private readonly text: string;

    constructor({ text, chunkSize, chunkOverlap }: { text: string; chunkSize?: number; chunkOverlap?: number }) {
        super(`TextLoader_${md5(text)}`, { text: truncateCenterString(text, 50) }, chunkSize ?? 300, chunkOverlap ?? 0);
        this.text = text;
    }

    override async *getUnfilteredChunks() {
        const tuncatedObjectString = truncateCenterString(this.text, 50);
        const chunker = new RecursiveCharacterTextSplitter({
            chunkSize: this.chunkSize,
            chunkOverlap: this.chunkOverlap,
        });
        const chunks = await chunker.splitText(cleanString(this.text));

        for (const chunk of chunks) {
            yield {
                pageContent: chunk,
                metadata: {
                    type: <'TextLoader'>'TextLoader',
                    source: tuncatedObjectString,
                    textId: this.uniqueId,
                },
            };
        }
    }
}
