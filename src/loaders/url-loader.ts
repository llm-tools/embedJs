import { getMimeType } from 'stream-mime-type';
import createDebugMessages from 'debug';
import axios from 'axios';
import md5 from 'md5';

import { BaseLoader } from '../interfaces/base-loader.js';
import { createLoaderFromMimeType } from '../util/mime.js';
import { truncateCenterString } from '../util/strings.js';

export class UrlLoader extends BaseLoader<{ type: 'UrlLoader' }> {
    private readonly debug = createDebugMessages('embedjs:loader:UrlLoader');
    private readonly url: string;

    constructor({ url }: { url: string }) {
        super(`UrlLoader_${md5(url)}`, { url: truncateCenterString(url, 50) });
        this.url = url;
    }

    override async *getUnfilteredChunks() {
        this.debug('Loader is a valid URL!');
        const stream = (await axios.get(this.url, { responseType: 'stream' })).data;
        const { mime } = await getMimeType(stream);
        this.debug(`Loader type detected as '${mime}'`);
        stream.destroy();

        const loader = await createLoaderFromMimeType(this.url, mime);
        for await (const result of await loader.getUnfilteredChunks()) {
            yield {
                pageContent: result.pageContent,
                metadata: {
                    type: <'UrlLoader'>'UrlLoader',
                    source: this.url,
                },
            };
        }
    }
}
