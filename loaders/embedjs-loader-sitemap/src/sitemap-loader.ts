import md5 from 'md5';
import Sitemapper from 'sitemapper';
import createDebugMessages from 'debug';

import { BaseLoader } from '@llm-tools/embedjs-interfaces';
import { WebLoader } from '@llm-tools/embedjs-loader-web';

export class SitemapLoader extends BaseLoader<{ type: 'SitemapLoader' }> {
    public static async test(url: string): Promise<boolean> {
        try {
            // @ts-ignore
            await new Sitemapper({ url, timeout: 15000 }).fetch();
            return true;
        } catch {
            return false;
        }
    }

    private readonly debug = createDebugMessages('embedjs:loader:SitemapLoader');
    private readonly url: string;

    constructor({ url, chunkSize, chunkOverlap }: { url: string; chunkSize?: number; chunkOverlap?: number }) {
        super(`SitemapLoader_${md5(url)}`, { url }, chunkSize ?? 2000, chunkOverlap);
        this.url = url;
    }

    override async *getUnfilteredChunks() {
        try {
            // @ts-ignore
            const { sites } = await new Sitemapper({ url: this.url, timeout: 15000 }).fetch();
            this.debug(`Sitemap '${this.url}' returned ${sites.length} URLs`);

            for (const url of sites) {
                const webLoader = new WebLoader({
                    urlOrContent: url,
                    chunkSize: this.chunkSize,
                    chunkOverlap: this.chunkOverlap,
                });

                for await (const chunk of webLoader.getUnfilteredChunks()) {
                    yield {
                        ...chunk,
                        metadata: {
                            ...chunk.metadata,
                            type: 'SitemapLoader' as const,
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
