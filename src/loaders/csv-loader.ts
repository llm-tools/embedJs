import { parse, Options as CsvParseOptions } from 'csv-parse';
import createDebugMessages from 'debug';
import axios from 'axios';
import fs from 'node:fs';
import md5 from 'md5';

import { BaseLoader } from '../interfaces/base-loader.js';
import { cleanString, isValidURL } from '../util/strings.js';

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
        this.csvParseOptions = csvParseOptions;
    }

    override async *getUnfilteredChunks() {
        const parser = this.isUrl
            ? (await axios.get(this.filePathOrUrl, { responseType: 'stream' })).data
            : fs.createReadStream(this.filePathOrUrl).pipe(parse(this.csvParseOptions));
        this.debug('CsvParser stream created');

        let i = 0;
        for await (const record of parser) {
            yield {
                pageContent: cleanString(record.join(',')),
                metadata: {
                    type: <'CsvLoader'>'CsvLoader',
                    source: this.filePathOrUrl,
                },
            };
            i++;
        }

        this.debug(`CsvParser for filePathOrUrl '${this.filePathOrUrl}' resulted in ${i} entries`);
    }
}
