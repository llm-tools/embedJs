import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { nanoid } from 'nanoid';
import md5 from 'md5';

import { BaseLoader } from '../interfaces/base-loader.js';
import { cleanString } from '../global/utils.js';

export class TextLoader implements BaseLoader<{ type: 'TEXT'; chunkId: number; id: string; textId: string }> {
    private readonly text: string;
    private readonly uniqueId: string;

    constructor({ text }: { text: string }) {
        this.text = text;
        this.uniqueId = nanoid();
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
