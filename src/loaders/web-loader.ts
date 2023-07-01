import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { convert } from 'html-to-text';
import axios from 'axios';
import md5 from 'md5';

import { BaseLoader } from '../interfaces/base-loader.js';
import { cleanString } from '../global/utils.js';

export class WebLoader extends BaseLoader<{ type: 'WEB'; chunkId: number; id: string; urlId: string }> {
    private readonly url: string;

    constructor({ url }: { url: string }) {
        super(md5(url));
        this.url = url;
    }

    async getChunks() {
        const chunker = new RecursiveCharacterTextSplitter({ chunkSize: 300, chunkOverlap: 0 });

        const { data } = await axios.get<string>(this.url, { responseType: 'document' });
        const text = convert(data, {
            wordwrap: false,
        });

        const chunks = await chunker.splitText(cleanString(text));
        return chunks.map((chunk, index) => {
            return {
                pageContent: chunk,
                metadata: {
                    type: <'WEB'>'WEB',
                    urlId: this.uniqueId,
                    id: md5(chunk),
                    chunkId: index,
                },
            };
        });
    }
}
