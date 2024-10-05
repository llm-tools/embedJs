// import { BaseLoader } from './interfaces/base-loader.js';
import { importBaseLoader } from './util.js';

await importBaseLoader('ConfluenceLoader', '@llm-tools/embedjs-loader-confluence');
// export type ConfluenceLoaderParam = ConstructorParameters<typeof ConfluenceLoader>[0];

// export type LoaderParam = string | BaseLoader | ({ type: 'Confluence' } & ConfluenceLoaderParam);
// | ({ type: 'Web' } & ConstructorParameters<typeof WebLoader>[0])
// | ({ type: 'Doc' } & ConstructorParameters<typeof DocxLoader>[0])
// | ({ type: 'Excel' } & ConstructorParameters<typeof ExcelLoader>[0])
// | ({ type: 'Json' } & ConstructorParameters<typeof JsonLoader>[0])
// | ({ type: 'Pdf' } & ConstructorParameters<typeof PdfLoader>[0])
// | ({ type: 'Ppt' } & ConstructorParameters<typeof PptLoader>[0])
// | ({ type: 'Sitemap' } & ConstructorParameters<typeof SitemapLoader>[0])
// | ({ type: 'Text' } & ConstructorParameters<typeof TextLoader>[0])
// | ({ type: 'YoutubeChannel' } & ConstructorParameters<typeof YoutubeChannelLoader>[0])
// | ({ type: 'Youtube' } & ConstructorParameters<typeof YoutubeLoader>[0])
// | ({ type: 'YoutubeSearch' } & ConstructorParameters<typeof YoutubeSearchLoader>[0])
// | ({ type: 'LocalPath' } & ConstructorParameters<typeof LocalPathLoader>[0])
// | ({ type: 'Url' } & ConstructorParameters<typeof UrlLoader>[0])
// | ({ type: 'Csv' } & ConstructorParameters<typeof CsvLoader>[0]);
