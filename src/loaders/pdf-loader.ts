import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import * as fs from 'node:fs/promises';
import pdf from 'pdf-parse-fork';
import axios from 'axios';
import md5 from 'md5';

import { BaseLoader } from '../interfaces/base-loader.js';
import { cleanString } from '../global/utils.js';

export class PdfLoader extends BaseLoader<{ type: 'PDF'; chunkId: number; pathOrUrl: string; id: string }> {
    private readonly pathOrUrl: string;
    private readonly isUrl: boolean;

    constructor({ url, uniqueId }: { url: string; uniqueId?: string });
    constructor({ filePath, uniqueId }: { filePath: string; uniqueId?: string });
    constructor({ filePath, url, uniqueId }: { filePath?: string; url?: string; uniqueId?: string }) {
        super(md5(uniqueId ?? filePath ?? url));

        this.isUrl = filePath ? false : true;
        this.pathOrUrl = filePath ?? url;
    }

    async getChunks() {
        const chunker = new RecursiveCharacterTextSplitter({ chunkSize: 300, chunkOverlap: 0 });

        let fileBuffer: Buffer;
        if (!this.isUrl) fileBuffer = await fs.readFile(this.pathOrUrl);
        else
            fileBuffer = Buffer.from((await axios.get(this.pathOrUrl, { responseType: 'arraybuffer' })).data, 'binary');
        const pdfParsed = await pdf(fileBuffer);

        const chunks = await chunker.splitText(cleanString(pdfParsed.text));
        console.log(chunks);
        return chunks.map((chunk, index) => {
            return {
                pageContent: chunk,
                metadata: {
                    type: <'PDF'>'PDF',
                    pathOrUrl: this.pathOrUrl,
                    id: md5(chunk),
                    chunkId: index,
                },
            };
        });
    }
}
