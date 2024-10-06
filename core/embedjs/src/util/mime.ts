import mime from 'mime';
import createDebugMessages from 'debug';
import { BaseLoader } from '@llm-tools/embedjs-interfaces';
import { TextLoader } from '../loaders/text-loader.js';

export async function createLoaderFromMimeType(loader: string, mimeType: string): Promise<BaseLoader> {
    switch (mimeType) {
        case 'application/msword':
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
            const { DocxLoader } = await import('@llm-tools/embedjs-loader-msoffice').catch(() => {
                throw new Error(
                    'Package `@llm-tools/embedjs-loader-msoffice` needs to be installed to load docx files',
                );
            });
            return new DocxLoader({ filePathOrUrl: loader });
        }
        case 'application/vnd.ms-excel':
        case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
            const { ExcelLoader } = await import('@llm-tools/embedjs-loader-msoffice').catch(() => {
                throw new Error(
                    'Package `@llm-tools/embedjs-loader-msoffice` needs to be installed to load excel files',
                );
            });
            return new ExcelLoader({ filePathOrUrl: loader });
        }
        case 'application/pdf': {
            const { PdfLoader } = await import('@llm-tools/embedjs-loader-pdf').catch(() => {
                throw new Error('Package `@llm-tools/embedjs-loader-pdf` needs to be installed to load PDF files');
            });
            return new PdfLoader({ filePathOrUrl: loader });
        }
        case 'application/vnd.openxmlformats-officedocument.presentationml.presentation': {
            const { PptLoader } = await import('@llm-tools/embedjs-loader-msoffice').catch(() => {
                throw new Error(
                    'Package `@llm-tools/embedjs-loader-msoffice` needs to be installed to load pptx files',
                );
            });
            return new PptLoader({ filePathOrUrl: loader });
        }
        case 'text/plain': {
            const fineType = mime.getType(loader);
            createDebugMessages('embedjs:createLoaderFromMimeType')(`Fine type for '${loader}' is '${fineType}'`);
            if (fineType === 'text/csv') {
                const { CsvLoader } = await import('@llm-tools/embedjs-loader-csv').catch(() => {
                    throw new Error('Package `@llm-tools/embedjs-loader-csv` needs to be installed to load csv files');
                });
                return new CsvLoader({ filePathOrUrl: loader });
            } else return new TextLoader({ text: loader });
        }
        case 'application/csv': {
            const { CsvLoader } = await import('@llm-tools/embedjs-loader-csv').catch(() => {
                throw new Error('Package `@llm-tools/embedjs-loader-csv` needs to be installed to load csv files');
            });
            return new CsvLoader({ filePathOrUrl: loader });
        }
        case 'text/html': {
            const { WebLoader } = await import('@llm-tools/embedjs-loader-web').catch(() => {
                throw new Error('Package `@llm-tools/embedjs-loader-web` needs to be installed to load web documents');
            });
            return new WebLoader({ urlOrContent: loader });
        }
        case 'text/xml': {
            const { SitemapLoader } = await import('@llm-tools/embedjs-loader-sitemap').catch(() => {
                throw new Error('Package `@llm-tools/embedjs-loader-sitemap` needs to be installed to load sitemaps');
            });
            if (await SitemapLoader.test(loader)) {
                return new SitemapLoader({ url: loader });
            }
            throw new SyntaxError(`No processor found for generic xml`);
        }
        default:
            throw new SyntaxError(`Unknown mime type '${mimeType}'`);
    }
}
