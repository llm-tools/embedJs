import md5 from 'md5';
import usetube from 'usetube';
import createDebugMessages from 'debug';

import { mapAsync } from '../global/utils.js';
import { BaseLoader } from '../interfaces/base-loader.js';
import { YoutubeChannelLoader } from './youtube-channel.js';

export class YoutubeSearchLoader extends BaseLoader<{
    type: 'YoutubeSearchLoader';
    chunkId: number;
    searchString: string;
}> {
    private readonly debug = createDebugMessages('embedjs:loader:YoutubeSearchLoader');
    private readonly searchString: string;

    constructor({ searchString }: { searchString: string }) {
        super(`YoutubeSearchLoader${md5(searchString)}`);
        this.searchString = searchString;
    }

    async getChunks() {
        try {
            const { channels } = await usetube.searchChannel(this.searchString);
            this.debug(
                `Search for channels with search string '${this.searchString}' found ${channels.length} entries`,
            );
            const channelIds = channels.map((c) => c.channel_id).slice(0, 1);

            const chunks = (
                await mapAsync(channelIds, (channelId) => {
                    const youtubeLoader = new YoutubeChannelLoader({ channelId });
                    return youtubeLoader.getChunks();
                })
            )
                .flat(1)
                .map((c) => {
                    delete c.metadata.channelId;
                    return c;
                });

            return chunks.map((chunk) => ({
                ...chunk,
                metadata: {
                    ...chunk.metadata,
                    type: <'YoutubeSearchLoader'>'YoutubeSearchLoader',
                    searchString: this.searchString,
                },
            }));
        } catch (e) {
            this.debug('Could not search for string', this.searchString, e);
            return [];
        }
    }
}
