import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { YoutubeTranscript } from 'youtube-transcript';
import md5 from 'md5';

import { BaseLoader } from '../interfaces/base-loader.js';
import { cleanString } from '../global/utils.js';

export class YoutubeLoader extends BaseLoader<{ type: 'YOUTUBE'; chunkId: number; id: string; videoIdOrUrl: string }> {
    private readonly videoIdOrUrl: string;

    constructor({ videoIdOrUrl }: { videoIdOrUrl: string }) {
        super(`YoutubeLoader_${md5(videoIdOrUrl)}`);
        this.videoIdOrUrl = videoIdOrUrl;
    }

    async getChunks() {
        const chunker = new RecursiveCharacterTextSplitter({ chunkSize: 300, chunkOverlap: 0, keepSeparator: false });
        const transcripts = await YoutubeTranscript.fetchTranscript(this.videoIdOrUrl, { lang: 'en' });

        const chunks: string[] = [];
        for await (const transcript of transcripts) {
            chunks.push(...(await chunker.splitText(cleanString(transcript.text))));
        }

        return chunks.map((chunk, index) => {
            return {
                pageContent: chunk,
                metadata: {
                    type: <'YOUTUBE'>'YOUTUBE',
                    videoIdOrUrl: md5(this.videoIdOrUrl),
                    id: md5(chunk),
                    chunkId: index,
                },
            };
        });
    }
}
