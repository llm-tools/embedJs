import { micromark } from 'micromark';
import { mdxJsx } from 'micromark-extension-mdx-jsx';
import { gfmHtml, gfm } from 'micromark-extension-gfm';
import createDebugMessages from 'debug';
import fs from 'node:fs';
import md5 from 'md5';

import { BaseLoader } from '@llm-tools/embedjs-interfaces';
import { getSafe, isValidURL, stream2buffer } from '@llm-tools/embedjs-utils';
import { WebLoader } from '@llm-tools/embedjs-loader-web';

export class MarkdownLoader extends BaseLoader<{ type: 'MarkdownLoader' }> {
    private readonly debug = createDebugMessages('embedjs:loader:MarkdownLoader');
    private readonly filePathOrUrl: string;
    private readonly isUrl: boolean;

    constructor({
        filePathOrUrl,
        chunkOverlap,
        chunkSize,
    }: {
        filePathOrUrl: string;
        chunkSize?: number;
        chunkOverlap?: number;
    }) {
        super(`MarkdownLoader_${md5(filePathOrUrl)}`, { filePathOrUrl }, chunkSize ?? 1000, chunkOverlap ?? 0);

        this.filePathOrUrl = filePathOrUrl;
        this.isUrl = isValidURL(filePathOrUrl) ? true : false;
    }

    override async *getUnfilteredChunks() {
        const buffer = this.isUrl
            ? (await getSafe(this.filePathOrUrl, { format: 'buffer' })).body
            : await stream2buffer(fs.createReadStream(this.filePathOrUrl));

        this.debug('MarkdownLoader stream created');
        const result = micromark(buffer, { extensions: [gfm(), mdxJsx()], htmlExtensions: [gfmHtml()] });
        this.debug('Markdown parsed...');

        const webLoader = new WebLoader({
            urlOrContent: result,
            chunkSize: this.chunkSize,
            chunkOverlap: this.chunkOverlap,
        });

        for await (const result of await webLoader.getUnfilteredChunks()) {
            result.pageContent = result.pageContent.replace(/[\[\]\(\)\{\}]/g, '');

            yield {
                pageContent: result.pageContent,
                metadata: {
                    type: 'MarkdownLoader' as const,
                    source: this.filePathOrUrl,
                },
            };
        }

        this.debug(`MarkdownLoader for filePathOrUrl '${this.filePathOrUrl}' finished`);
    }
}
