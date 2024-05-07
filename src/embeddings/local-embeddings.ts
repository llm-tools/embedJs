import { BaseEmbeddings } from '../interfaces/base-embeddings.js';
import axios from 'axios';

export class LocalEmbeddings implements BaseEmbeddings {
    private serverUrl: string;
    private dimensions: number;

    // Dimensions for 'all-MiniLM-L6-v2' are 384
    constructor(serverUrl: string = 'http://localhost:5000/embed', dimensions: number = 384) {
        this.serverUrl = serverUrl;
        this.dimensions = dimensions;
    }

    getDimensions(): number {
        return this.dimensions;
    }

    async embedDocuments(texts: string[]): Promise<number[][]> {
        try {
            const response = await axios.post(this.serverUrl, { texts });
            return response.data;
        } catch (error) {
            console.error('Error embedding documents:', error);
            throw error;
        }
    }

    async embedQuery(text: string): Promise<number[]> {
        return this.embedDocuments([text]).then(res => res[0]);
    }
}