import { HumanMessage } from '@langchain/core/messages';
import { getMimeType } from 'stream-mime-type';
import createDebugMessages from 'debug';
import exifremove from 'exifremove';
import fs from 'node:fs';
import md5 from 'md5';

import { BaseLoader, BaseModel } from '@llm-tools/embedjs-interfaces';
import { cleanString, contentTypeToMimeType, getSafe, isValidURL, streamToBuffer } from '@llm-tools/embedjs-utils';

export class ImageLoader extends BaseLoader<{ type: 'ImageLoader' }> {
    private readonly debug = createDebugMessages('embedjs:loader:ImageLoader');
    private readonly filePathOrUrl: string;
    private readonly isUrl: boolean;
    private captionModel: BaseModel;
    private mime?: string;

    constructor({
        filePathOrUrl,
        captionModel,
        mime,
    }: {
        filePathOrUrl: string;
        captionModel?: BaseModel;
        mime?: string;
    }) {
        super(`ImageLoader_${md5(filePathOrUrl)}`, { filePathOrUrl }, 100000, 300);

        this.mime = mime;
        this.captionModel = captionModel;
        this.filePathOrUrl = filePathOrUrl;
        this.isUrl = isValidURL(filePathOrUrl) ? true : false;
    }

    public override injectModel(model: BaseModel) {
        if (!this.captionModel) {
            this.captionModel = model;
        }
    }

    override async *getUnfilteredChunks() {
        if (!this.captionModel) throw new Error('No model available to describe image');

        if (!this.mime) {
            this.debug('Mime type not provided; starting auto-detect');

            if (this.isUrl) {
                const response = await getSafe(this.filePathOrUrl, { headers: { 'Accept-Encoding': '' } });
                const stream = response.body as unknown as NodeJS.ReadableStream;
                this.mime = (await getMimeType(stream, { strict: true })).mime;

                if (!this.mime) {
                    this.mime = contentTypeToMimeType(response.headers.get('content-type'));
                    this.debug(`Using type '${this.mime}' from content-type header`);
                }
            } else {
                const stream = fs.createReadStream(this.filePathOrUrl);
                this.mime = (await getMimeType(stream)).mime;
                stream.destroy();
            }
        }

        this.debug(`Image stream detected type '${this.mime}'`);
        const buffer = this.isUrl
            ? (await getSafe(this.filePathOrUrl, { format: 'buffer' })).body
            : await streamToBuffer(fs.createReadStream(this.filePathOrUrl));

        const plainImageBuffer = exifremove.remove(buffer);

        const message = new HumanMessage({
            content: [
                {
                    type: 'text',
                    text: 'what does this image contain?',
                },
                {
                    type: 'image_url',
                    image_url: {
                        url: `data:${this.mime};base64,${plainImageBuffer.toString('base64')}`,
                    },
                },
            ],
        });

        this.debug('Asking LLM to describe image');
        const response = await this.captionModel.simpleQuery([message]);
        this.debug('LLM describes image as: ', response.result);

        yield {
            pageContent: cleanString(response.result),
            metadata: {
                type: 'ImageLoader' as const,
                source: this.filePathOrUrl,
            },
        };

        this.debug(`Loaded image details for filePathOrUrl '${this.filePathOrUrl}'`);
    }
}
