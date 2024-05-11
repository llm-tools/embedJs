import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { getTextExtractor } from 'office-text-extractor';
import md5 from 'md5';

import { BaseLoader } from '../interfaces/base-loader.js';
import { cleanString } from '../util/strings.js';

export class ExcelLoader extends BaseLoader<{ type: 'ExcelLoader' }> {
    private readonly pathOrUrl: string;
    private readonly isUrl: boolean;

    constructor({ url }: { url: string });
    constructor({ filePath }: { filePath: string });
    constructor({ filePath, url }: { filePath?: string; url?: string }) {
        super(`ExcelLoader_${md5(filePath ? `FILE_${filePath}` : `URL_${url}`)}`);

        this.isUrl = filePath ? false : true;
        this.pathOrUrl = filePath ?? url;
    }

    override async *getChunks() {
        const chunker = new RecursiveCharacterTextSplitter({ chunkSize: 500, chunkOverlap: 0 });

        const extractor = getTextExtractor();
        const xlsxParsed = await extractor.extractText({ input: this.pathOrUrl, type: this.isUrl ? 'url' : 'file' });

        const chunks = await chunker.splitText(cleanString(xlsxParsed));
        for (const chunk of chunks) {
            yield {
                pageContent: chunk,
                contentHash: md5(chunk),
                metadata: {
                    type: <'ExcelLoader'>'ExcelLoader',
                    source: this.pathOrUrl,
                },
            };
        }
    }
}
