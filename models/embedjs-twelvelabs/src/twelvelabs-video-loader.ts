import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { TwelveLabs } from 'twelvelabs-js';
import createDebugMessages from 'debug';
import md5 from 'md5';

import { BaseLoader } from '@llm-tools/embedjs-interfaces';
import { cleanString } from '@llm-tools/embedjs-utils';

/**
 * Loads a video into embedJs by analysing it with TwelveLabs' Pegasus video
 * understanding model. Pegasus watches the video (visuals, motion and audio)
 * and returns a natural language description, which is then chunked and embedded
 * like any other text source. This lets you run RAG over video content directly
 * from a public URL, without a separate transcription step.
 */
export class TwelveLabsVideoLoader extends BaseLoader<{ type: 'TwelveLabsVideoLoader' }> {
    private readonly debug = createDebugMessages('embedjs:loader:TwelveLabsVideoLoader');
    private readonly client: TwelveLabs;
    private readonly url: string;
    private readonly model: 'pegasus1.2' | 'pegasus1.5';
    private readonly prompt: string;
    private readonly maxTokens: number;

    constructor({
        url,
        apiKey,
        model = 'pegasus1.2',
        prompt = 'Describe everything that happens in this video in detail, including the visuals, actions, spoken words and on-screen text.',
        maxTokens = 2048,
        chunkSize,
        chunkOverlap,
    }: {
        /** Publicly accessible URL of the video file (direct link to raw media). */
        url: string;
        /** TwelveLabs API key. Falls back to the `TWELVELABS_API_KEY` environment variable. */
        apiKey?: string;
        /** Pegasus model name. Defaults to `pegasus1.2`. */
        model?: 'pegasus1.2' | 'pegasus1.5';
        /** Prompt that guides the analysis. Defaults to a detailed description prompt. */
        prompt?: string;
        /** Maximum response length in tokens. Defaults to `2048`. */
        maxTokens?: number;
        chunkSize?: number;
        chunkOverlap?: number;
    }) {
        super(
            `TwelveLabsVideoLoader_${md5(`${url}_${model}_${prompt}`)}`,
            { url },
            chunkSize ?? 2000,
            chunkOverlap ?? 0,
        );

        const key = apiKey ?? process.env.TWELVELABS_API_KEY;
        if (!key) {
            throw new Error(
                'TwelveLabs API key is required. Pass it via the `apiKey` option or set the TWELVELABS_API_KEY environment variable.',
            );
        }

        this.client = new TwelveLabs({ apiKey: key });
        this.url = url;
        this.model = model;
        this.prompt = prompt;
        this.maxTokens = maxTokens;
    }

    override async *getUnfilteredChunks() {
        const chunker = new RecursiveCharacterTextSplitter({
            chunkSize: this.chunkSize,
            chunkOverlap: this.chunkOverlap,
        });

        try {
            const response = await this.client.analyze({
                modelName: this.model,
                video: { type: 'url', url: this.url },
                prompt: this.prompt,
                maxTokens: this.maxTokens,
            });

            const text = response.data;
            if (!text) {
                this.debug('Pegasus returned no analysis for video', this.url);
                return;
            }

            this.debug(`Pegasus analysis (length ${text.length}) obtained for video`, this.url);

            for (const chunk of await chunker.splitText(cleanString(text))) {
                yield {
                    pageContent: chunk,
                    metadata: {
                        type: 'TwelveLabsVideoLoader' as const,
                        source: this.url,
                    },
                };
            }
        } catch (e) {
            this.debug('Could not analyze video', this.url, e);
        }
    }
}
