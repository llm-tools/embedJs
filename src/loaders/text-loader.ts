import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import md5 from 'md5';

import { BaseLoader } from '../interfaces/base-loader.js';
import { cleanString } from '../global/utils.js';

export class TextLoader extends BaseLoader<{ type: 'TextLoader'; chunkId: number; textId: string }> {
    private readonly text: string;

    constructor({ text }: { text: string }) {
        super(`TextLoader_${md5(text)}`);
        this.text = text;
    }

    async getChunks() {
        const chunker = new RecursiveCharacterTextSplitter({ chunkSize: 200, chunkOverlap: 0, keepSeparator: false });
        const chunks = await chunker.splitText(cleanString(this.text));

        return chunks.map((chunk, index) => {
            return {
                pageContent: chunk,
                contentHash: md5(chunk),
                metadata: {
                    type: <'TextLoader'>'TextLoader',
                    textId: this.uniqueId,
                    chunkId: index,
                },
            };
        });
    }
}
