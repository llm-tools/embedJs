import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import createDebugMessages from 'debug';
import { convert } from 'html-to-text';
import axios from 'axios';
import md5 from 'md5';

import { BaseLoader } from '../interfaces/base-loader.js';
import { cleanString } from '../global/utils.js';

export class WebLoader extends BaseLoader<{ type: 'WebLoader'; chunkId: number; urlId: string }> {
    private readonly debug = createDebugMessages('embedjs:loader:WebLoader');
    private readonly url: string;

    constructor({ url }: { url: string }) {
        super(`WebLoader_${md5(url)}`);
        this.url = url;
    }

    async *getChunks() {
        const chunker = new RecursiveCharacterTextSplitter({ chunkSize: 2000, chunkOverlap: 0 });

        try {
            const { data } = await axios.get<string>(this.url, { responseType: 'document' });
            const text = convert(data, {
                wordwrap: false,
            });

            let i = 0;
            const chunks = await chunker.splitText(cleanString(text));
            for (const chunk of chunks) {
                yield {
                    pageContent: chunk,
                    contentHash: md5(chunk),
                    metadata: {
                        type: <'WebLoader'>'WebLoader',
                        urlId: this.uniqueId,
                        chunkId: i,
                    },
                };

                i++;
            }
        } catch (e) {
            this.debug('Could not parse website url', this.url, e);
        }
    }
}
