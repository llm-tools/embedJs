import md5 from 'md5';
import usetube from 'usetube';
import createDebugMessages from 'debug';

import { BaseLoader } from '../interfaces/base-loader.js';
import { YoutubeChannelLoader } from './youtube-channel-loader.js';

export class YoutubeSearchLoader extends BaseLoader<{ type: 'YoutubeSearchLoader' }> {
    private readonly debug = createDebugMessages('embedjs:loader:YoutubeSearchLoader');
    private readonly searchString: string;

    constructor({ searchString }: { searchString: string }) {
        super(`YoutubeSearchLoader${md5(searchString)}`);
        this.searchString = searchString;
    }

    override async *getChunks() {
        try {
            const { channels } = await usetube.searchChannel(this.searchString);
            this.debug(
                `Search for channels with search string '${this.searchString}' found ${channels.length} entries`,
            );
            const channelIds = channels.map((c) => c.channel_id);

            for (const channelId of channelIds) {
                const youtubeLoader = new YoutubeChannelLoader({ channelId });

                for await (const chunk of youtubeLoader.getChunks()) {
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
