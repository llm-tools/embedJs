import mime from 'mime';
import createDebugMessages from 'debug';

import { BaseLoader } from '@llm-tools/embedjs-interfaces';
import { TextLoader } from '../loaders/text-loader.js';

export async function createLoaderFromMimeType(loaderData: string, mimeType: string): Promise<BaseLoader> {
    createDebugMessages('embedjs:util:createLoaderFromMimeType')(`Incoming mime type '${mimeType}'`);

    switch (mimeType) {
        case 'application/msword':
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
            const { DocxLoader } = await import('@llm-tools/embedjs-loader-msoffice').catch(() => {
                throw new Error(
                    'Package `@llm-tools/embedjs-loader-msoffice` needs to be installed to load docx files',
                );
            });
            createDebugMessages('embedjs:util:createLoaderFromMimeType')('Dynamically imported DocxLoader');
            return new DocxLoader({ filePathOrUrl: loaderData });
        }
        case 'application/vnd.ms-excel':
        case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
            const { ExcelLoader } = await import('@llm-tools/embedjs-loader-msoffice').catch(() => {
                throw new Error(
                    'Package `@llm-tools/embedjs-loader-msoffice` needs to be installed to load excel files',
                );
            });
            createDebugMessages('embedjs:util:createLoaderFromMimeType')('Dynamically imported ExcelLoader');
            return new ExcelLoader({ filePathOrUrl: loaderData });
        }
        case 'application/pdf': {
            const { PdfLoader } = await import('@llm-tools/embedjs-loader-pdf').catch(() => {
                throw new Error('Package `@llm-tools/embedjs-loader-pdf` needs to be installed to load PDF files');
            });
            createDebugMessages('embedjs:util:createLoaderFromMimeType')('Dynamically imported PdfLoader');
            return new PdfLoader({ filePathOrUrl: loaderData });
        }
        case 'application/vnd.openxmlformats-officedocument.presentationml.presentation': {
            const { PptLoader } = await import('@llm-tools/embedjs-loader-msoffice').catch(() => {
                throw new Error(
                    'Package `@llm-tools/embedjs-loader-msoffice` needs to be installed to load pptx files',
                );
            });
            createDebugMessages('embedjs:util:createLoaderFromMimeType')('Dynamically imported PptLoader');
            return new PptLoader({ filePathOrUrl: loaderData });
        }
        case 'text/plain': {
            const fineType = mime.getType(loaderData);
            createDebugMessages('embedjs:util:createLoaderFromMimeType')(
                `Fine type for '${loaderData}' is '${fineType}'`,
            );
            if (fineType === 'text/csv') {
                const { CsvLoader } = await import('@llm-tools/embedjs-loader-csv').catch(() => {
                    throw new Error('Package `@llm-tools/embedjs-loader-csv` needs to be installed to load CSV files');
                });

                createDebugMessages('embedjs:util:createLoaderFromMimeType')('Dynamically imported CsvLoader');
                return new CsvLoader({ filePathOrUrl: loaderData });
            } else return new TextLoader({ text: loaderData });
        }
        case 'application/csv': {
            const { CsvLoader } = await import('@llm-tools/embedjs-loader-csv').catch(() => {
                throw new Error('Package `@llm-tools/embedjs-loader-csv` needs to be installed to load CSV files');
            });
            createDebugMessages('embedjs:util:createLoaderFromMimeType')('Dynamically imported CsvLoader');
            return new CsvLoader({ filePathOrUrl: loaderData });
        }
        case 'text/html': {
            const { WebLoader } = await import('@llm-tools/embedjs-loader-web').catch(() => {
                throw new Error('Package `@llm-tools/embedjs-loader-web` needs to be installed to load web documents');
            });
            createDebugMessages('embedjs:util:createLoaderFromMimeType')('Dynamically imported WebLoader');
            return new WebLoader({ urlOrContent: loaderData });
        }
        case 'text/xml': {
            const { SitemapLoader } = await import('@llm-tools/embedjs-loader-sitemap').catch(() => {
                throw new Error('Package `@llm-tools/embedjs-loader-sitemap` needs to be installed to load sitemaps');
            });
            createDebugMessages('embedjs:util:createLoaderFromMimeType')('Dynamically imported SitemapLoader');

            if (await SitemapLoader.test(loaderData)) {
                return new SitemapLoader({ url: loaderData });
            }

            //This is not a Sitemap but is still XML
            const { XmlLoader } = await import('@llm-tools/embedjs-loader-xml').catch(() => {
                throw new Error('Package `@llm-tools/embedjs-loader-xml` needs to be installed to load XML documents');
            });
            createDebugMessages('embedjs:util:createLoaderFromMimeType')('Dynamically imported XmlLoader');
            return new XmlLoader({ filePathOrUrl: loaderData });
        }
        case 'text/x-markdown':
        case 'text/markdown': {
            const { MarkdownLoader } = await import('@llm-tools/embedjs-loader-markdown').catch(() => {
                throw new Error(
                    'Package `@llm-tools/embedjs-loader-markdown` needs to be installed to load markdown files',
                );
            });
            createDebugMessages('embedjs:util:createLoaderFromMimeType')('Dynamically imported MarkdownLoader');
            return new MarkdownLoader({ filePathOrUrl: loaderData });
        }
        case undefined:
            throw new Error(`MIME type could not be detected. Please file an issue if you think this is a bug.`);
        default:
            throw new Error(`Unknown mime type '${mimeType}'`);
    }
}
