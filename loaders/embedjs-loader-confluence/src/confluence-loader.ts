import { ConfluenceClient } from 'confluence.js';
import createDebugMessages from 'debug';
import md5 from 'md5';

import { BaseLoader } from '@llm-tools/embedjs-interfaces';
import { WebLoader } from '@llm-tools/embedjs-loader-web';

export class ConfluenceLoader extends BaseLoader<{ type: 'ConfluenceLoader' }, { version: number }> {
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
        super(
            `ConfluenceLoader_${md5(spaceNames.sort().join(','))}`,
            { spaceNames },
            chunkSize ?? 2000,
            chunkOverlap ?? 200,
        );

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
            let count = 0;

            for await (const result of this.processSpace(spaceKey)) {
                yield result;
                count++;
            }

            this.debug(`Space '${spaceKey}' had ${count} new pages`);
        }
    }

    private async *processSpace(spaceKey: string) {
        this.debug('Processing space', spaceKey);
        try {
            const spaceContent = await this.confluence.space.getContentForSpace({ spaceKey });
            this.debug(`Confluence space '${spaceKey}' has '${spaceContent['page'].results.length}' root pages`);

            for (const { id } of spaceContent['page'].results) {
                for await (const result of this.processPage(id)) {
                    yield result;
                }
            }
        } catch (e) {
            this.debug('Could not get space details', spaceKey, e);
            return;
        }
    }

    private async *processPage(pageId: string) {
        let confluenceVersion = 0;
        try {
            const spaceProperties = await this.confluence.content.getContentById({
                id: pageId,
                expand: ['version'],
            });

            if (!spaceProperties.version.number) throw new Error('Version number not found in space properties...');
            confluenceVersion = spaceProperties.version.number;
        } catch (e) {
            this.debug('Could not get page properties. Page will be SKIPPED!', pageId, e.response);
            return;
        }

        let doProcess = false;
        if (!(await this.checkInCache(pageId))) {
            this.debug(`Processing '${pageId}' for the FIRST time...`);
            doProcess = true;
        } else {
            const cacheVersion = (await this.getFromCache(pageId)).version;
            if (cacheVersion !== confluenceVersion) {
                this.debug(
                    `For page '${pageId}' - version in cache is ${cacheVersion} and confluence version is ${confluenceVersion}. This page will be PROCESSED.`,
                );
                doProcess = true;
            } else
                this.debug(
                    `For page '${pageId}' - version in cache and confluence are the same ${confluenceVersion}. This page will be SKIPPED.`,
                );
        }

        if (!doProcess) {
            this.debug(`Skipping page '${pageId}'`);
            return;
        }

        try {
            const content = await this.confluence.content.getContentById({
                id: pageId,
                expand: ['body', 'children.page', 'body.view'],
            });

            if (!content.body.view.value) {
                this.debug(`Page '${pageId}' has empty content. Skipping...`);
                return;
            }

            for await (const result of this.getContentChunks(content.body.view.value, content._links.webui)) {
                yield result;
            }

            await this.saveToCache(pageId, { version: confluenceVersion });

            if (content.children) {
                for (const { id } of content.children.page.results) {
                    for await (const result of this.processPage(id)) {
                        yield result;
                    }
                }
            }
        } catch (e) {
            this.debug('Error! Could not process page content or children', pageId, e);
            return;
        }
    }

    private async *getContentChunks(pageBody: string, pageUrl: string) {
        const webLoader = new WebLoader({
            urlOrContent: pageBody,
            chunkSize: this.chunkSize,
            chunkOverlap: this.chunkOverlap,
        });

        for await (const result of await webLoader.getUnfilteredChunks()) {
            //remove all types of empty brackets from string
            // eslint-disable-next-line no-useless-escape
            result.pageContent = result.pageContent.replace(/[\[\]\(\)\{\}]/g, '');

            yield {
                pageContent: result.pageContent,
                metadata: {
                    type: 'ConfluenceLoader' as const,
                    source: `${this.confluenceBaseUrl}/wiki${pageUrl}`,
                },
            };
        }
    }
}
