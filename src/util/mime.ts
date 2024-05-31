import mime from 'mime';
import createDebugMessages from 'debug';

import { BaseLoader } from '../interfaces/base-loader.js';
import { DocxLoader } from '../loaders/docx-loader.js';
import { ExcelLoader } from '../loaders/excel-loader.js';
import { PdfLoader } from '../loaders/pdf-loader.js';
import { PptLoader } from '../loaders/ppt-loader.js';
import { SitemapLoader } from '../loaders/sitemap-loader.js';
import { TextLoader } from '../loaders/text-loader.js';
import { WebLoader } from '../loaders/web-loader.js';
import { CsvLoader } from '../loaders/csv-loader.js';

export async function createLoaderFromMimeType(loader: string, mimeType: string): Promise<BaseLoader> {
    switch (mimeType) {
        case 'application/msword':
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
            return new DocxLoader({ filePathOrUrl: loader });
        case 'application/vnd.ms-excel':
        case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
            return new ExcelLoader({ filePathOrUrl: loader });
        case 'application/pdf':
            return new PdfLoader({ filePathOrUrl: loader });
        case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
            return new PptLoader({ filePathOrUrl: loader });
        case 'text/plain':
            const fineType = mime.getType(loader);
            createDebugMessages('embedjs:createLoaderFromMimeType')(`Fine type for '${loader}' is '${fineType}'`);
            if (fineType === 'text/csv') return new CsvLoader({ filePathOrUrl: loader });
            else return new TextLoader({ text: loader });
        case 'text/html':
            return new WebLoader({ urlOrContent: loader });
        case 'text/xml':
            if (await SitemapLoader.test(loader)) {
                return new SitemapLoader({ url: loader });
            }
            throw new SyntaxError(`No processor found for generic xml`);
        default:
            throw new SyntaxError(`Unknown mime type '${mimeType}'`);
    }
}
