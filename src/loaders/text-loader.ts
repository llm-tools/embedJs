import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import md5 from 'md5';

import { BaseLoader } from '../interfaces/base-loader.js';
import { cleanString } from '../global/utils.js';

export class TextLoader extends BaseLoader<{ type: 'TEXT'; chunkId: number; id: string; textId: string }> {
    private readonly text: string;

    constructor({ text }: { text: string }) {
        super(md5(text));
        this.text = text;
    }

    async getChunks() {
        const chunker = new RecursiveCharacterTextSplitter({ chunkSize: 300, chunkOverlap: 0 });
        const chunks = await chunker.splitText(cleanString(this.text));

        return chunks.map((chunk, index) => {
            return {
                pageContent: chunk,
                metadata: {
                    type: <'TEXT'>'TEXT',
                    textId: this.uniqueId,
                    id: md5(chunk),
                    chunkId: index,
                },
            };
        });
    }
}
