import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import createDebugMessages from 'debug';
import { convert } from 'html-to-text';
import axios from 'axios';
import md5 from 'md5';

import { BaseLoader } from '../interfaces/base-loader.js';
import { cleanString, truncateCenterString } from '../util/strings.js';

export class WebLoader extends BaseLoader<{ type: 'WebLoader' }> {
    private readonly debug = createDebugMessages('embedjs:loader:WebLoader');
    private readonly contentOrUrl: string;
    private readonly isUrl: boolean;

    constructor({ url }: { url: string });
    constructor({ content }: { content: string });
    constructor({ content, url }: { content?: string; url?: string }) {
        super(`WebLoader_${md5(content ? `CONTENT_${content}` : `URL_${url}`)}`);

        this.isUrl = content ? false : true;
        this.contentOrUrl = content ?? url;
    }

    override async *getChunks() {
        const chunker = new RecursiveCharacterTextSplitter({ chunkSize: 2000, chunkOverlap: 0 });

        try {
            const data = this.isUrl
                ? (await axios.get<string>(this.contentOrUrl, { responseType: 'document' })).data
                : this.contentOrUrl;

            const text = convert(data, {
                wordwrap: false,
            });

            const tuncatedObjectString = this.isUrl ? undefined : truncateCenterString(this.contentOrUrl, 50);

            const chunks = await chunker.splitText(cleanString(text));
            for (const chunk of chunks) {
                yield {
                    pageContent: chunk,
                    contentHash: md5(chunk),
                    metadata: {
                        type: <'WebLoader'>'WebLoader',
                        source: this.isUrl ? this.contentOrUrl : tuncatedObjectString,
                    },
                };
            }
        } catch (e) {
            this.debug('Could not parse input', this.contentOrUrl, e);
        }
    }
}
