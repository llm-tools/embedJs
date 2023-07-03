import 'dotenv/config';

import { LLMApplicationBuilder, WebLoader } from '../../../src/index.js';
import { HNSWDb } from '../../../src/databases/hnswlib-db.js';

const llmApplication = await new LLMApplicationBuilder()
    .addLoader(new WebLoader({ url: 'https://adhityan.com/' }))
    .setVectorDb(new HNSWDb())
    .build();

console.log(await llmApplication.query('Who is Adhityan?'));
// Adhityan is a programmer, entrepreneur, and architect who is the Director of Engineering at Shift and has a presence on LinkedIn, GitHub, and Angel.co.
