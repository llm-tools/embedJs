import 'dotenv/config';

import { RAGApplicationBuilder, WebLoader, YoutubeLoader, SitemapLoader } from '../../../src/index.js';
import { HNSWDb } from '../../../src/vectorDb/hnswlib-db.js';
import { VertexAI, GeckoEmbedding } from '../../../src/index.js';

const llmApplication = await new RAGApplicationBuilder()
    .setModel(new VertexAI({ modelName: 'gemini-1.5-pro-preview-0409' }))
    .setEmbeddingModel(new GeckoEmbedding())
    .setSearchResultCount(30)
    .setVectorDb(new HNSWDb())
    .build();

await llmApplication.addLoader(new YoutubeLoader({ videoIdOrUrl: 'pQiT2U5E9tI' }));
await llmApplication.addLoader(new SitemapLoader({ url: 'https://tesla-info.com/sitemap.xml' }));
await llmApplication.addLoader(new WebLoader({ urlOrContent: 'https://en.wikipedia.org/wiki/Tesla,_Inc.' }));

let question = 'Who founded Tesla?';
console.log('[QUESTION]', question);
console.log((await llmApplication.query(question)).result);

question = 'Tell me about the history of Tesla?';
console.log('[QUESTION]', question);
console.log((await llmApplication.query(question)).result);

question = 'What cars does Tesla have';
console.log('[QUESTION]', question);
console.log((await llmApplication.query(question)).result);
