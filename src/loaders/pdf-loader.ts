import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import pdf from 'pdf-parse-fork';
import md5 from 'md5';

import { BaseLoader } from '../interfaces/base-loader.js';
import { cleanString } from '../global/utils.js';

export class PdfLoader extends BaseLoader<{ type: 'PDF'; chunkId: number; pdfName: string; id: string }> {
    private readonly filePath: string;

    constructor({ filePath, uniqueId }: { filePath: string; uniqueId?: string }) {
        super(md5(uniqueId ?? filePath));
        this.filePath = filePath;
    }

    async getChunks() {
        const chunker = new RecursiveCharacterTextSplitter({ chunkSize: 300, chunkOverlap: 0 });

        const filename = path.basename(this.filePath);
        const fileBuffer = await fs.readFile(this.filePath);
        const pdfParsed = await pdf(fileBuffer);

        const chunks = await chunker.splitText(cleanString(pdfParsed.text));
        return chunks.map((chunk, index) => {
            return {
                pageContent: chunk,
                metadata: {
                    type: <'PDF'>'PDF',
                    pdfName: filename,
                    id: md5(chunk),
                    chunkId: index,
                },
            };
        });
    }
}
