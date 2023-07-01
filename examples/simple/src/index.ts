import 'dotenv/config';
import * as path from 'node:path';
import { fileURLToPath } from 'url';

import {
    LLMApplicationBuilder,
    LanceDb,
    PdfLoader,
    PineconeDb,
    TextLoader,
    YoutubeLoader,
} from '../../../src/index.js';

const __filename = fileURLToPath(import.meta.url);
const llmApplication = await new LLMApplicationBuilder()
    .setTemperature(0.1)
    // .addLoader(
    //     new PdfLoader({ filePath: '/Volumes/Personal/Distributed Systems/Designing Data Intensive Applications.pdf' }),
    // )
    // .addLoader(new YoutubeLoader({ videoIdOrUrl: 'https://www.youtube.com/watch?v=w2KbwC-s7pY' }))
    // .addLoader(new TextLoader({ text: 'The best company name for a company making colorful socks is LordKina' }))
    // .setVectorDb(new LanceDb({ path: path.resolve(path.dirname(__filename), '../../../db') }))
    .setVectorDb(new PineconeDb({ projectName: 'test', namespace: 'dev' }))
    .build();

console.log(await llmApplication.query('what types of secondary index exist?'));
