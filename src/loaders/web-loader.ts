import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import createDebugMessages from 'debug';
import { convert } from 'html-to-text';
import axios from 'axios';
import md5 from 'md5';

import { BaseLoader } from '../interfaces/base-loader.js';
import { cleanString, isValidURL, truncateCenterString } from '../util/strings.js';

export class WebLoader extends BaseLoader<{ type: 'WebLoader' }> {
    private readonly debug = createDebugMessages('embedjs:loader:WebLoader');
    private readonly urlOrContent: string;
    private readonly isUrl: boolean;

    constructor({
        urlOrContent,
        chunkSize,
        chunkOverlap,
    }: {
        urlOrContent: string;
        chunkSize?: number;
        chunkOverlap?: number;
    }) {
        super(`WebLoader_${md5(urlOrContent)}`, { urlOrContent }, chunkSize ?? 2000, chunkOverlap ?? 0);

        this.isUrl = isValidURL(urlOrContent) ? true : false;
        this.urlOrContent = urlOrContent;
        ``;
    }

    override async *getUnfilteredChunks() {
        const chunker = new RecursiveCharacterTextSplitter({
            chunkSize: this.chunkSize,
            chunkOverlap: this.chunkOverlap,
        });

        try {
            const data = this.isUrl
                ? (await axios.get<string>(this.urlOrContent, { responseType: 'document' })).data
                : this.urlOrContent;

            const text = convert(data, {
                wordwrap: false,
                preserveNewlines: false,
            }).replace(/(?:https?|ftp):\/\/[\n\S]+/g, '');

            const tuncatedObjectString = this.isUrl ? undefined : truncateCenterString(this.urlOrContent, 50);

            const chunks = await chunker.splitText(cleanString(text));
            for (const chunk of chunks) {
                yield {
                    pageContent: chunk,
                    metadata: {
                        type: <'WebLoader'>'WebLoader',
                        source: this.isUrl ? this.urlOrContent : tuncatedObjectString,
                    },
                };
            }
        } catch (e) {
            this.debug('Could not parse input', this.urlOrContent, e);
        }
    }
}
