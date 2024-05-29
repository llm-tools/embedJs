import fs from 'node:fs';
import path from 'node:path';
import createDebugMessages from 'debug';

import { isValidJson, isValidURL } from '../util/strings.js';
import { DocxLoader } from '../loaders/docx-loader.js';
import { ExcelLoader } from '../loaders/excel-loader.js';
import { WebLoader } from '../loaders/web-loader.js';
import { PdfLoader } from '../loaders/pdf-loader.js';
import { PptLoader } from '../loaders/ppt-loader.js';
import { TextLoader } from '../loaders/text-loader.js';
import { SitemapLoader } from '../loaders/sitemap-loader.js';
import { ConfluenceLoader } from '../loaders/confluence-loader.js';
import { YoutubeChannelLoader } from '../loaders/youtube-channel-loader.js';
import { YoutubeSearchLoader } from '../loaders/youtube-search-loader.js';
import { YoutubeLoader } from '../loaders/youtube-loader.js';
import { BaseLoader } from '../interfaces/base-loader.js';
import { JsonLoader } from '../loaders/json-loader.js';
import { UrlLoader } from '../loaders/url-loader.js';
import { LocalPathLoader } from '../loaders/local-path-loader.js';

export type LoaderParam =
    | string
    | BaseLoader
    | ({ type: 'Confluence' } & ConstructorParameters<typeof ConfluenceLoader>[0])
    | ({ type: 'Web' } & ConstructorParameters<typeof WebLoader>[0])
    | ({ type: 'Doc' } & ConstructorParameters<typeof DocxLoader>[0])
    | ({ type: 'Excel' } & ConstructorParameters<typeof ExcelLoader>[0])
    | ({ type: 'Json' } & ConstructorParameters<typeof JsonLoader>[0])
    | ({ type: 'Pdf' } & ConstructorParameters<typeof PdfLoader>[0])
    | ({ type: 'Ppt' } & ConstructorParameters<typeof PptLoader>[0])
    | ({ type: 'Sitemap' } & ConstructorParameters<typeof SitemapLoader>[0])
    | ({ type: 'Text' } & ConstructorParameters<typeof TextLoader>[0])
    | ({ type: 'YoutubeChannel' } & ConstructorParameters<typeof YoutubeChannelLoader>[0])
    | ({ type: 'Youtube' } & ConstructorParameters<typeof YoutubeLoader>[0])
    | ({ type: 'YoutubeSearch' } & ConstructorParameters<typeof YoutubeSearchLoader>[0])
    | ({ type: 'LocalPath' } & ConstructorParameters<typeof LocalPathLoader>[0])
    | ({ type: 'Url' } & ConstructorParameters<typeof UrlLoader>[0]);

export class DynamicLoader {
    private static readonly debug = createDebugMessages('embedjs:DynamicLoader');

    private static async unfurlLoader(loader: string): Promise<BaseLoader> {
        if (isValidURL(loader)) {
            DynamicLoader.debug('Loader is a valid URL!');
            return new UrlLoader({ url: loader });
        } else if (fs.existsSync(path.resolve(loader))) {
            DynamicLoader.debug('Loader is a valid path on local!');
            return new LocalPathLoader({ path: loader });
        } else if (isValidJson(loader)) {
            DynamicLoader.debug('Loader is a valid JSON!');
            return new JsonLoader({ object: JSON.parse(loader) });
        } else if (loader.length === 11) {
            DynamicLoader.debug('Loader is likely a youtube video id!');
            return new YoutubeLoader({ videoIdOrUrl: loader });
        } else {
            throw new SyntaxError(`Unknown loader ${loader}`);
        }
    }

    public static async createLoader(loader: LoaderParam): Promise<BaseLoader> {
        if (typeof loader === 'string') {
            DynamicLoader.debug('Loader is of type string; unfurling');
            return await DynamicLoader.unfurlLoader(loader);
        }

        if (loader instanceof BaseLoader) {
            DynamicLoader.debug('Loader is of type BaseLoader; returning as is');
            return loader;
        }

        if (loader.type) {
            DynamicLoader.debug('Loader is an object of specific type; 1to1 match can be done...');
            switch (loader.type) {
                case 'Confluence':
                    return new ConfluenceLoader(loader);
                case 'Web':
                    return new WebLoader(loader);
                case 'Doc':
                    return new DocxLoader(loader);
                case 'Excel':
                    return new ExcelLoader(loader);
                case 'Json':
                    return new JsonLoader(loader);
                case 'Pdf':
                    return new PdfLoader(loader);
                case 'Ppt':
                    return new PptLoader(loader);
                case 'Sitemap':
                    return new SitemapLoader(loader);
                case 'Text':
                    return new TextLoader(loader);
                case 'YoutubeChannel':
                    return new YoutubeChannelLoader(loader);
                case 'Youtube':
                    return new YoutubeLoader(loader);
                case 'YoutubeSearch':
                    return new YoutubeSearchLoader(loader);
                case 'LocalPath':
                    return new LocalPathLoader(loader);
                case 'Url':
                    return new UrlLoader(loader);
                default:
                    throw new SyntaxError(`Unknown loader type ${(<any>loader).type}`);
            }
        }

        DynamicLoader.debug('Loader could not be parsed!');
        throw new SyntaxError(`Unknown loader ${loader}`);
    }

    public static async createLoaders(loaders: LoaderParam[]): Promise<BaseLoader[]> {
        return (await Promise.all(loaders.map(DynamicLoader.createLoader))).flat(1);
    }
}
