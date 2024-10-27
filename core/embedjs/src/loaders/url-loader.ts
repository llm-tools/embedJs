import { getMimeType } from 'stream-mime-type';
import createDebugMessages from 'debug';
import axios from 'axios';
import md5 from 'md5';

import { BaseLoader } from '@llm-tools/embedjs-interfaces';
import { truncateCenterString } from '@llm-tools/embedjs-utils';
import { createLoaderFromMimeType } from '../util/mime.js';

export class UrlLoader extends BaseLoader<{ type: 'UrlLoader' }> {
    private readonly debug = createDebugMessages('embedjs:loader:UrlLoader');
    private readonly url: URL;

    constructor({ url }: { url: string }) {
        super(`UrlLoader_${md5(url)}`, { url: truncateCenterString(url, 50) });
        this.url = new URL(url);
        this.debug(`UrlLoader verified '${url}' is a valid URL!`);
    }

    override async *getUnfilteredChunks() {
        const response = await axios.get(this.url.href, {
            responseType: 'stream',
        });
        const { mime } = await getMimeType(response.data, { strict: true });
        this.debug(`Loader type detected as '${mime}'`);
        response.data.destroy();

        const loader = await createLoaderFromMimeType(this.url.href, mime);
        for await (const result of await loader.getUnfilteredChunks()) {
            yield {
                pageContent: result.pageContent,
                metadata: {
                    type: <const>'UrlLoader',
                    source: this.url.href,
                },
            };
        }
    }
}
