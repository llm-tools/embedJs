import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import * as fs from 'node:fs/promises';
import pdf from 'pdf-parse-fork';
import axios from 'axios';
import md5 from 'md5';

import { BaseLoader } from '../interfaces/base-loader.js';
import { cleanString } from '../global/utils.js';

export class PdfLoader extends BaseLoader<{ type: 'PdfLoader'; chunkId: number; pathOrUrl: string }> {
    private readonly pathOrUrl: string;
    private readonly isUrl: boolean;

    constructor({ url, uniqueId }: { url: string; uniqueId?: string });
    constructor({ filePath, uniqueId }: { filePath: string; uniqueId?: string });
    constructor({ filePath, url, uniqueId }: { filePath?: string; url?: string; uniqueId?: string }) {
        super(`PdfLoader_${md5(uniqueId ?? filePath ?? url)}`);

        this.isUrl = filePath ? false : true;
        this.pathOrUrl = filePath ?? url;
    }

    async getChunks() {
        const chunker = new RecursiveCharacterTextSplitter({ chunkSize: 500, chunkOverlap: 0, keepSeparator: false });

        let fileBuffer: Buffer;
        if (!this.isUrl) fileBuffer = await fs.readFile(this.pathOrUrl);
        else
            fileBuffer = Buffer.from((await axios.get(this.pathOrUrl, { responseType: 'arraybuffer' })).data, 'binary');
        const pdfParsed = await pdf(fileBuffer);

        const chunks = await chunker.splitText(cleanString(pdfParsed.text));
        return chunks.map((chunk, index) => {
            return {
                pageContent: chunk,
                contentHash: md5(chunk),
                metadata: {
                    type: <'PdfLoader'>'PdfLoader',
                    pathOrUrl: this.pathOrUrl,
                    chunkId: index,
                },
            };
        });
    }
}
