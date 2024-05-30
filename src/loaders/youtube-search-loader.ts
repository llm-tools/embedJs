import md5 from 'md5';
import usetube from 'usetube';
import createDebugMessages from 'debug';

import { BaseLoader } from '../interfaces/base-loader.js';
import { YoutubeChannelLoader } from './youtube-channel-loader.js';

export class YoutubeSearchLoader extends BaseLoader<{ type: 'YoutubeSearchLoader' }> {
    private readonly debug = createDebugMessages('embedjs:loader:YoutubeSearchLoader');
    private readonly searchString: string;

    constructor({
        youtubeSearchString,
        chunkSize,
        chunkOverlap,
    }: {
        youtubeSearchString: string;
        chunkSize?: number;
        chunkOverlap?: number;
    }) {
        super(
            `YoutubeSearchLoader${md5(youtubeSearchString)}`,
            { youtubeSearchString },
            chunkSize ?? 2000,
            chunkOverlap,
        );
        this.searchString = youtubeSearchString;
    }

    override async *getUnfilteredChunks() {
        try {
            const { channels } = await usetube.searchChannel(this.searchString);
            this.debug(
                `Search for channels with search string '${this.searchString}' found ${channels.length} entries`,
            );
            const channelIds = channels.map((c) => c.channel_id);

            for (const youtubeChannelId of channelIds) {
                const youtubeLoader = new YoutubeChannelLoader({
                    youtubeChannelId,
                    chunkSize: this.chunkSize,
                    chunkOverlap: this.chunkOverlap,
                });

                for await (const chunk of youtubeLoader.getUnfilteredChunks()) {
                    yield {
                        ...chunk,
                        metadata: {
                            ...chunk.metadata,
                            type: <'YoutubeSearchLoader'>'YoutubeSearchLoader',
                            originalSource: this.searchString,
                        },
                    };
                }
            }
        } catch (e) {
            this.debug('Could not search for string', this.searchString, e);
        }
    }
}
