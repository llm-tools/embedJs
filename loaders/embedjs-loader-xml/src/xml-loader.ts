import { X2jOptions, XMLParser } from 'fast-xml-parser';
import createDebugMessages from 'debug';
import fs from 'node:fs';
import md5 from 'md5';

import { BaseLoader } from '@llm-tools/embedjs-interfaces';
import { cleanString, getSafe, isValidURL, stream2buffer } from '@llm-tools/embedjs-utils';

export class XmlLoader extends BaseLoader<{ type: 'XmlLoader' }> {
    private readonly debug = createDebugMessages('embedjs:loader:XmlLoader');
    private readonly xmlParseOptions: X2jOptions;
    private readonly filePathOrUrl: string;
    private readonly isUrl: boolean;

    constructor({
        filePathOrUrl,
        xmlParseOptions,
        chunkOverlap,
        chunkSize,
    }: {
        filePathOrUrl: string;
        xmlParseOptions?: X2jOptions;
        chunkSize?: number;
        chunkOverlap?: number;
    }) {
        super(`XmlLoader_${md5(filePathOrUrl)}`, { filePathOrUrl }, chunkSize ?? 1000, chunkOverlap ?? 0);

        this.filePathOrUrl = filePathOrUrl;
        this.isUrl = isValidURL(filePathOrUrl) ? true : false;
        this.xmlParseOptions = xmlParseOptions;
    }

    override async *getUnfilteredChunks() {
        const buffer = this.isUrl
            ? (await getSafe(this.filePathOrUrl, { format: 'buffer' })).body
            : await stream2buffer(fs.createReadStream(this.filePathOrUrl));

        this.debug('XmlLoader stream created');
        const parsed = new XMLParser(this.xmlParseOptions).parse(buffer);
        this.debug('XML data parsed');

        const array = Array.isArray(parsed) ? parsed : [parsed];
        for (const entry of array) {
            const str = cleanString(JSON.stringify(entry));

            if ('id' in entry) {
                entry.preEmbedId = entry.id;
                delete entry.id;
            }

            yield {
                pageContent: str,
                metadata: {
                    type: 'XmlLoader' as const,
                    source: this.filePathOrUrl,
                },
            };
        }

        this.debug(`XmlLoader for filePathOrUrl '${this.filePathOrUrl}' finished`);
    }
}
