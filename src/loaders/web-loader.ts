import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { convert } from 'html-to-text';
import axios from 'axios';
import md5 from 'md5';

import { BaseLoader } from '../interfaces/base-loader.js';
import { cleanString } from '../global/utils.js';

export class WebLoader extends BaseLoader<{ type: 'WebLoader'; chunkId: number; urlId: string }> {
    private readonly url: string;

    constructor({ url }: { url: string }) {
        super(`WebLoader_${md5(url)}`);
        this.url = url;
    }

    async getChunks() {
        const chunker = new RecursiveCharacterTextSplitter({ chunkSize: 2000, chunkOverlap: 0 });

        const { data } = await axios.get<string>(this.url, { responseType: 'document' });
        const text = convert(data, {
            wordwrap: false,
        });

        const chunks = await chunker.splitText(cleanString(text));
        return chunks.map((chunk, index) => {
            return {
                pageContent: chunk,
                contentHash: md5(chunk),
                metadata: {
                    type: <'WebLoader'>'WebLoader',
                    urlId: this.uniqueId,
                    chunkId: index,
                },
            };
        });
    }
}
