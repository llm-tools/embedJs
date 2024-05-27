import fs from 'node:fs';
import path from 'node:path';
import { getMimeType } from 'stream-mime-type';
import axios from 'axios';

import { ConfluenceLoader } from '../loaders/confluence-loader.js';
import { DocxLoader } from '../loaders/docx-loader.js';
import { ExcelLoader } from '../loaders/excel-loader.js';
import { WebLoader } from '../loaders/web-loader.js';
import { PdfLoader } from '../loaders/pdf-loader.js';
import { PptLoader } from '../loaders/ppt-loader.js';
import { SitemapLoader } from '../loaders/sitemap-loader.js';
import { TextLoader } from '../loaders/text-loader.js';
import { YoutubeChannelLoader } from '../loaders/youtube-channel-loader.js';
import { YoutubeLoader } from '../loaders/youtube-loader.js';
import { YoutubeSearchLoader } from '../loaders/youtube-search-loader.js';
import { BaseLoader } from '../interfaces/base-loader.js';
import { JsonLoader } from '../loaders/json-loader.js';
import { isValidJson, isValidURL } from '../util/strings.js';

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
    | ({ type: 'YoutubeSearch' } & ConstructorParameters<typeof YoutubeSearchLoader>[0]);

async function createLoaderFromMimeType(loader: string, loaderType: string): Promise<BaseLoader> {
    switch (loaderType) {
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
            return new TextLoader({ text: loader });
        case 'text/html':
            return new WebLoader({ urlOrContent: loader });
        default:
            throw new SyntaxError(`Unknown mime type ${loaderType}`);
    }
}

async function unfurlPathToLoader(loader: string): Promise<BaseLoader[]> {
    const isDir = fs.lstatSync(loader).isDirectory();

    if (!isDir) {
        const mime = (await getMimeType(fs.createReadStream(loader))).mime;
        return [await createLoaderFromMimeType(loader, mime)];
    } else {
        const files = fs.readdirSync(loader);
        return (await Promise.all(files.map(unfurlPathToLoader))).flat(1);
    }
}

async function unfurlLoader(loader: string): Promise<BaseLoader[]> {
    if (isValidURL(loader)) {
        const mime = (await getMimeType(await axios.get(loader, { responseType: 'stream' }))).mime;
        return [await createLoaderFromMimeType(loader, mime)];
    } else if (loader === path.basename(loader)) {
        return unfurlPathToLoader(loader);
    } else if (isValidJson(loader)) {
        return [new JsonLoader({ object: JSON.parse(loader) })];
    }
    else if(loader.length === 11) {
        return [new YoutubeLoader({ videoIdOrUrl: loader })]
    } else {
        throw new SyntaxError(`Unknown loader ${loader}`);
    }
}

export async function createLoader(loader: LoaderParam): Promise<BaseLoader[]> {
    if (typeof loader === 'string') {
        return await unfurlLoader(loader);
    }

    if (loader instanceof BaseLoader) {
        return [loader];
    }

    switch (loader.type) {
        case 'Confluence':
            return [new ConfluenceLoader(loader)];
        case 'Web':
            return [new WebLoader(loader)];
        case 'Doc':
            return [new DocxLoader(loader)];
        case 'Excel':
            return [new ExcelLoader(loader)];
        case 'Json':
            return [new JsonLoader(loader)];
        case 'Pdf':
            return [new PdfLoader(loader)];
        case 'Ppt':
            return [new PptLoader(loader)];
        case 'Sitemap':
            return [new SitemapLoader(loader)];
        case 'Text':
            return [new TextLoader(loader)];
        case 'YoutubeChannel':
            return [new YoutubeChannelLoader(loader)];
        case 'Youtube':
            return [new YoutubeLoader(loader)];
        case 'YoutubeSearch':
            return [new YoutubeSearchLoader(loader)];
        default:
            throw new SyntaxError(`Unknown loader type ${loader}`);
    }
}

export async function createLoaders(loaders: LoaderParam[]): Promise<BaseLoader[]> {
    return (await Promise.all(loaders.map(createLoader))).flat(1);
}
