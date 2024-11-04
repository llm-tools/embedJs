import { parse, Options as CsvParseOptions } from 'csv-parse';
import createDebugMessages from 'debug';
import fs from 'node:fs';
import md5 from 'md5';

import { BaseLoader } from '@llm-tools/embedjs-interfaces';
import { cleanString, getSafe, isValidURL, stream2buffer } from '@llm-tools/embedjs-utils';

export class CsvLoader extends BaseLoader<{ type: 'CsvLoader' }> {
    private readonly debug = createDebugMessages('embedjs:loader:CsvLoader');
    private readonly csvParseOptions: CsvParseOptions;
    private readonly filePathOrUrl: string;
    private readonly isUrl: boolean;

    constructor({
        filePathOrUrl,
        csvParseOptions,
        chunkOverlap,
        chunkSize,
    }: {
        filePathOrUrl: string;
        csvParseOptions?: CsvParseOptions;
        chunkSize?: number;
        chunkOverlap?: number;
    }) {
        super(`CsvLoader_${md5(filePathOrUrl)}`, { filePathOrUrl }, chunkSize ?? 1000, chunkOverlap ?? 0);

        this.filePathOrUrl = filePathOrUrl;
        this.isUrl = isValidURL(filePathOrUrl) ? true : false;
        this.csvParseOptions = csvParseOptions ?? { autoParse: true };
    }

    override async *getUnfilteredChunks() {
        const buffer = this.isUrl
            ? (await getSafe(this.filePathOrUrl, { format: 'buffer' })).body
            : await stream2buffer(fs.createReadStream(this.filePathOrUrl));

        this.debug('CsvParser stream created');
        const parser = parse(buffer, this.csvParseOptions);
        this.debug('CSV parsing started...');

        for await (const record of parser) {
            yield {
                pageContent: cleanString(record.join(',')),
                metadata: {
                    type: 'CsvLoader' as const,
                    source: this.filePathOrUrl,
                },
            };
        }

        this.debug(`CsvParser for filePathOrUrl '${this.filePathOrUrl}' finished`);
    }
}
