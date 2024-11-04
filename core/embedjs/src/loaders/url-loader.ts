import { getMimeType } from 'stream-mime-type';
import createDebugMessages from 'debug';
import md5 from 'md5';

import { contentTypeToMimeType, getSafe, truncateCenterString } from '@llm-tools/embedjs-utils';
import { BaseLoader } from '@llm-tools/embedjs-interfaces';
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
        const response = await getSafe(this.url.toString(), { headers: { 'Accept-Encoding': '' } });
        const stream = response.body as unknown as NodeJS.ReadableStream;
        let { mime } = await getMimeType(stream, { strict: true });
        this.debug(`Loader stream detected type '${mime}'`);

        if (!mime) {
            mime = contentTypeToMimeType(response.headers.get('content-type'));
            this.debug(`Using type '${mime}' from content-type header`);
        }

        try {
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
        } catch (err) {
            this.debug(`Error creating loader for mime type '${mime}'`, err);
        }
    }
}
