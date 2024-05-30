import { Content } from 'confluence.js/out/api/models/content.js';
import { ConfluenceClient } from 'confluence.js';
import createDebugMessages from 'debug';
import md5 from 'md5';

import { BaseLoader } from '../interfaces/base-loader.js';
import { WebLoader } from './web-loader.js';

export class ConfluenceLoader extends BaseLoader<{ type: 'ConfluenceLoader' }> {
    private readonly debug = createDebugMessages('embedjs:loader:ConfluenceLoader');

    private readonly confluence: ConfluenceClient;
    private readonly confluenceBaseUrl: string;
    private readonly spaceNames: string[];

    constructor({
        spaceNames,
        confluenceBaseUrl,
        confluenceUsername,
        confluenceToken,
        chunkSize,
        chunkOverlap,
    }: {
        spaceNames: [string, ...string[]];
        confluenceBaseUrl?: string;
        confluenceUsername?: string;
        confluenceToken?: string;
        chunkSize?: number;
        chunkOverlap?: number;
    }) {
        super(`ConfluenceLoader_${md5(spaceNames.join(','))}`, { spaceNames }, chunkSize ?? 2000, chunkOverlap ?? 200);

        this.spaceNames = spaceNames;
        this.confluenceBaseUrl = confluenceBaseUrl ?? process.env.CONFLUENCE_BASE_URL;

        this.confluence = new ConfluenceClient({
            host: this.confluenceBaseUrl,
            authentication: {
                basic: {
                    username: confluenceUsername ?? process.env.CONFLUENCE_USER_NAME,
                    password: confluenceToken ?? process.env.CONFLUENCE_API_TOKEN,
                },
            },
        });
    }

    override async *getUnfilteredChunks() {
        for (const spaceKey of this.spaceNames) {
            try {
                const spaceContent = await this.confluence.space.getContentForSpace({ spaceKey });
                this.debug(
                    `Confluence space (length ${spaceContent['page'].results.length}) obtained for space`,
                    spaceKey,
                );

                for await (const result of this.getContentChunks(spaceContent['page'].results)) {
                    yield result;
                }
            } catch (e) {
                this.debug('Could not get space details', spaceKey, e);
                continue;
            }
        }
    }

    private async *getContentChunks(contentArray: Content[]) {
        for (const { id } of contentArray) {
            const content = await this.confluence.content.getContentById({
                id: id,
                expand: ['body', 'children.page', 'body.view'],
            });

            if (!content.body.view.value) continue;
            const webLoader = new WebLoader({
                urlOrContent: content.body.view.value,
                chunkSize: this.chunkSize,
                chunkOverlap: this.chunkOverlap,
            });

            for await (const result of await webLoader.getUnfilteredChunks()) {
                //remove all types of empty brackets from string
                result.pageContent = result.pageContent.replace(/[\[\]\(\)\{\}]/g, '');

                yield {
                    pageContent: result.pageContent,
                    metadata: {
                        type: <'ConfluenceLoader'>'ConfluenceLoader',
                        source: `${this.confluenceBaseUrl}/wiki${content._links.webui}`,
                    },
                };
            }

            if (content.children) {
                for await (const result of this.getContentChunks(content.children.page.results)) {
                    yield result;
                }
            }
        }
    }
}
