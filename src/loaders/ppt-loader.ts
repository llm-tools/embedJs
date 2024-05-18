import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { getTextExtractor } from 'office-text-extractor';
import md5 from 'md5';

import { BaseLoader } from '../interfaces/base-loader.js';
import { cleanString } from '../util/strings.js';

export class PptLoader extends BaseLoader<{ type: 'PptLoader' }> {
    private readonly pathOrUrl: string;
    private readonly isUrl: boolean;

    constructor({}: { url: string; chunkSize?: number; chunkOverlap?: number });
    constructor({}: { filePath: string; chunkSize?: number; chunkOverlap?: number });
    constructor({
        filePath,
        url,
        chunkSize,
        chunkOverlap,
    }: {
        filePath?: string;
        url?: string;
        chunkSize?: number;
        chunkOverlap?: number;
    }) {
        super(`PptLoader_${md5(filePath ? `FILE_${filePath}` : `URL_${url}`)}`, chunkSize ?? 300, chunkOverlap ?? 0);

        this.isUrl = filePath ? false : true;
        this.pathOrUrl = filePath ?? url;
    }

    override async *getUnfilteredChunks() {
        const chunker = new RecursiveCharacterTextSplitter({
            chunkSize: this.chunkSize,
            chunkOverlap: this.chunkOverlap,
        });

        const extractor = getTextExtractor();
        const docxParsed = await extractor.extractText({ input: this.pathOrUrl, type: this.isUrl ? 'url' : 'file' });

        const chunks = await chunker.splitText(cleanString(docxParsed));
        for (const chunk of chunks) {
            yield {
                pageContent: chunk,
                metadata: {
                    type: <'PptLoader'>'PptLoader',
                    source: this.pathOrUrl,
                },
            };
        }
    }
}
