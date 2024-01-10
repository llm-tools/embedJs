import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { YoutubeTranscript } from 'youtube-transcript';
import md5 from 'md5';

import { BaseLoader } from '../interfaces/base-loader.js';
import { cleanString } from '../global/utils.js';

export class YoutubeLoader extends BaseLoader<{ type: 'YoutubeLoader'; chunkId: number; videoIdOrUrl: string }> {
    private readonly videoIdOrUrl: string;

    constructor({ videoIdOrUrl }: { videoIdOrUrl: string }) {
        super(`YoutubeLoader_${md5(videoIdOrUrl)}`);
        this.videoIdOrUrl = videoIdOrUrl;
    }

    async getChunks() {
        const chunker = new RecursiveCharacterTextSplitter({ chunkSize: 2000, chunkOverlap: 0 });
        const transcripts = await YoutubeTranscript.fetchTranscript(this.videoIdOrUrl, { lang: 'en' });

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
    }
}
