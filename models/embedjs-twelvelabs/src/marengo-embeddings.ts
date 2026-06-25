import { TwelveLabs } from 'twelvelabs-js';
import { BaseEmbeddings } from '@llm-tools/embedjs-interfaces';

/**
 * Multimodal embeddings backed by TwelveLabs' Marengo model. Marengo embeds text,
 * image, audio and video into a single shared latent space, which makes it a good
 * fit for RAG over video libraries. This class exposes the text side of that space
 * so it can be used as a drop in embedding model for embedJs.
 *
 * The Marengo `marengo3.0` model returns 512 dimensional vectors.
 */
export class MarengoEmbeddings extends BaseEmbeddings {
    private readonly client: TwelveLabs;
    private readonly model: string;
    private readonly dimensions: number;

    constructor({
        apiKey,
        model = 'marengo3.0',
        dimensions = 512,
    }: {
        /** TwelveLabs API key. Falls back to the `TWELVELABS_API_KEY` environment variable. */
        apiKey?: string;
        /** Marengo model name. Defaults to `marengo3.0`. */
        model?: string;
        /** Embedding dimensions returned by the model. Defaults to `512` (marengo3.0). */
        dimensions?: number;
    } = {}) {
        super();

        const key = apiKey ?? process.env.TWELVELABS_API_KEY;
        if (!key) {
            throw new Error(
                'TwelveLabs API key is required. Pass it via the `apiKey` option or set the TWELVELABS_API_KEY environment variable.',
            );
        }

        this.client = new TwelveLabs({ apiKey: key });
        this.model = model;
        this.dimensions = dimensions;
    }

    override async getDimensions(): Promise<number> {
        return this.dimensions;
    }

    override async embedDocuments(texts: string[]): Promise<number[][]> {
        // The Marengo embed endpoint accepts a single text per request, so we fan out.
        return Promise.all(texts.map((text) => this.embedQuery(text)));
    }

    override async embedQuery(text: string): Promise<number[]> {
        const response = await this.client.embed.create({ modelName: this.model, text });
        const float = response.textEmbedding?.segments?.[0]?.float;

        if (!float) {
            const reason = response.textEmbedding?.errorMessage ?? 'no embedding was returned';
            throw new Error(`TwelveLabs Marengo did not return a text embedding: ${reason}`);
        }

        return float;
    }
}
