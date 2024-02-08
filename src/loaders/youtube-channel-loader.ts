import md5 from 'md5';
import usetube from 'usetube';
import createDebugMessages from 'debug';

import { BaseLoader } from '../interfaces/base-loader.js';
import { YoutubeLoader } from './youtube-loader.js';

export class YoutubeChannelLoader extends BaseLoader<{ type: 'YoutubeChannelLoader' }> {
    private readonly debug = createDebugMessages('embedjs:loader:YoutubeChannelLoader');
    private readonly channelId: string;

    constructor({ channelId }: { channelId: string }) {
        super(`YoutubeChannelLoader_${md5(channelId)}`);
        this.channelId = channelId;
    }

    override async *getChunks() {
        try {
            const videos = await usetube.getChannelVideos(this.channelId);
            this.debug(`Channel '${this.channelId}' returned ${videos.length} videos`);
            const videoIds = videos.map((v) => v.id);

            for (const videoId of videoIds) {
                const youtubeLoader = new YoutubeLoader({ videoIdOrUrl: videoId });

                for await (const chunk of youtubeLoader.getChunks()) {
                    yield {
                        ...chunk,
                        metadata: {
                            ...chunk.metadata,
                            type: <'YoutubeChannelLoader'>'YoutubeChannelLoader',
                            originalSource: this.channelId,
                        },
                    };
                }
            }
        } catch (e) {
            this.debug('Could not get videos for channel', this.channelId, e);
        }
    }
}
