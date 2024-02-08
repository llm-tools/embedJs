import md5 from 'md5';
import Sitemapper from 'sitemapper';
import createDebugMessages from 'debug';

import { BaseLoader } from '../interfaces/base-loader.js';
import { WebLoader } from './web-loader.js';

export class SitemapLoader extends BaseLoader<{ type: 'SitemapLoader' }> {
    private readonly debug = createDebugMessages('embedjs:loader:SitemapLoader');
    private readonly url: string;

    constructor({ url }: { url: string }) {
        super(`SitemapLoader_${md5(url)}`);
        this.url = url;
    }

    override async *getChunks() {
        try {
            // @ts-ignore
            const { sites } = await new Sitemapper({ url: this.url, timeout: 15000 }).fetch();
            this.debug(`Sitemap '${this.url}' returned ${sites.length} URLs`);

            for (const url of sites) {
                const webLoader = new WebLoader({ url });

                for await (const chunk of webLoader.getChunks()) {
                    yield {
                        ...chunk,
                        metadata: {
                            ...chunk.metadata,
                            type: <'SitemapLoader'>'SitemapLoader',
                            originalSource: this.url,
                        },
                    };
                }
            }
        } catch (e) {
            this.debug('Could not get sites from sitemap url', this.url, e);
        }
    }
}
