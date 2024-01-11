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

    async *getChunks() {
        const chunker = new RecursiveCharacterTextSplitter({ chunkSize: 300, chunkOverlap: 0 });
        const chunks = await chunker.splitText(cleanString(this.text));

        let i = 0;
        for (const chunk of chunks) {
            yield {
                pageContent: chunk,
                contentHash: md5(chunk),
                metadata: {
                    type: <'TextLoader'>'TextLoader',
                    textId: this.uniqueId,
                    chunkId: i,
                },
            };

            i++;
        }
    }
}
