import 'dotenv/config';
import { RAGApplicationBuilder } from '@llm-tools/embedjs';
import { OpenAi, OpenAiEmbeddings } from '@llm-tools/embedjs-openai';
import { WebLoader } from '@llm-tools/embedjs-loader-web';
import { HNSWDb } from '@llm-tools/embedjs-hnswlib';

const llmApplication = await new RAGApplicationBuilder()
    .setModel(new OpenAi({ modelName: 'gpt-4o' }))
    .setEmbeddingModel(new OpenAiEmbeddings({ model: 'text-embedding-3-small' }))
    .setVectorDb(new HNSWDb())
    .setSearchResultCount(30)
    .build();

await llmApplication.addLoader(new WebLoader({ urlOrContent: 'https://en.wikipedia.org/wiki/Tesla,_Inc.' }));

console.log(await llmApplication.query('Who founded Tesla?'));
