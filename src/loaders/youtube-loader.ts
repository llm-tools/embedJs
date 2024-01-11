import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { YoutubeTranscript } from 'youtube-transcript';
import createDebugMessages from 'debug';
import md5 from 'md5';

import { BaseLoader } from '../interfaces/base-loader.js';
import { cleanString } from '../global/utils.js';

export class YoutubeLoader extends BaseLoader<{ type: 'YoutubeLoader'; chunkId: number; videoIdOrUrl: string }> {
    private readonly debug = createDebugMessages('embedjs:loader:YoutubeLoader');
    private readonly videoIdOrUrl: string;

    constructor({ videoIdOrUrl }: { videoIdOrUrl: string }) {
        super(`YoutubeLoader_${md5(videoIdOrUrl)}`);
        this.videoIdOrUrl = videoIdOrUrl;
    }

    async getChunks() {
        const chunker = new RecursiveCharacterTextSplitter({ chunkSize: 2000, chunkOverlap: 0 });

        try {
            const transcripts = await YoutubeTranscript.fetchTranscript(this.videoIdOrUrl, { lang: 'en' });
            this.debug(`Transcripts (length ${transcripts.length}) obtained for video`, this.videoIdOrUrl);

            const chunks: string[] = [];
            for await (const transcript of transcripts) {
                chunks.push(...(await chunker.splitText(cleanString(transcript.text))));
            }

            return chunks.map((chunk, index) => {
                return {
                    pageContent: chunk,
                    contentHash: md5(chunk),
                    metadata: {
                        type: <'YoutubeLoader'>'YoutubeLoader',
                        videoIdOrUrl: md5(this.videoIdOrUrl),
                        chunkId: index,
                    },
                };
            });
        } catch (e) {
            this.debug('Could not get transcripts for video', this.videoIdOrUrl, e);
            return [];
        }
    }
}
