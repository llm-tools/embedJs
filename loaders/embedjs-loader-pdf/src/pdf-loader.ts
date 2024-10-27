import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { getTextExtractor } from 'office-text-extractor';
import md5 from 'md5';

import { BaseLoader } from '@llm-tools/embedjs-interfaces';
import { isValidURL, cleanString } from '@llm-tools/embedjs-utils';

export class PdfLoader extends BaseLoader<{ type: 'PdfLoader' }> {
    private readonly filePathOrUrl: string;
    private readonly isUrl: boolean;

    constructor({
        filePathOrUrl,
        chunkOverlap,
        chunkSize,
    }: {
        filePathOrUrl: string;
        chunkSize?: number;
        chunkOverlap?: number;
    }) {
        super(`PdfLoader_${md5(filePathOrUrl)}`, { filePathOrUrl }, chunkSize ?? 1000, chunkOverlap ?? 0);

        this.filePathOrUrl = filePathOrUrl;
        this.isUrl = isValidURL(filePathOrUrl) ? true : false;
    }

    override async *getUnfilteredChunks() {
        const chunker = new RecursiveCharacterTextSplitter({
            chunkSize: this.chunkSize,
            chunkOverlap: this.chunkOverlap,
        });

        const extractor = getTextExtractor();
        const pdfParsed = await extractor.extractText({ input: this.filePathOrUrl, type: this.isUrl ? 'url' : 'file' });

        const chunks = await chunker.splitText(cleanString(pdfParsed));
        for (const chunk of chunks) {
            yield {
                pageContent: chunk,
                metadata: {
                    type: 'PdfLoader' as const,
                    source: this.filePathOrUrl,
                },
            };
        }
    }
}
