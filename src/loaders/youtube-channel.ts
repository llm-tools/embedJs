import md5 from 'md5';
import usetube from 'usetube';
import createDebugMessages from 'debug';

import { mapAsync } from '../global/utils.js';
import { BaseLoader } from '../interfaces/base-loader.js';
import { YoutubeLoader } from './youtube-loader.js';

export class YoutubeChannelLoader extends BaseLoader<{
    type: 'YoutubeChannelLoader';
    chunkId: number;
    channelId: string;
}> {
    private readonly debug = createDebugMessages('embedjs:loader:YoutubeChannelLoader');
    private readonly channelId: string;

    constructor({ channelId }: { channelId: string }) {
        super(`YoutubeChannelLoader_${md5(channelId)}`);
        this.channelId = channelId;
    }

    async getChunks() {
        try {
            const videos = await usetube.getChannelVideos(this.channelId);
            this.debug(`Channel '${this.channelId}' returned ${videos.length} videos`);
            const videoIds = videos.map((v) => v.id);

            const chunks = (
                await mapAsync(videoIds, (videoId) => {
                    const youtubeLoader = new YoutubeLoader({ videoIdOrUrl: videoId });
                    return youtubeLoader.getChunks();
                })
            )
                .flat(1)
                .map((c) => {
                    delete c.metadata.videoIdOrUrl;
                    return c;
                });

            return chunks.map((chunk) => ({
                ...chunk,
                metadata: {
                    ...chunk.metadata,
                    type: <'YoutubeChannelLoader'>'YoutubeChannelLoader',
                    channelId: this.channelId,
                },
            }));
        } catch (e) {
            this.debug('Could not get videos for channel', this.channelId, e);
            return [];
        }
    }
}
