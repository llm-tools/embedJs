import 'dotenv/config';
import { RAGApplicationBuilder, UrlLoader } from '@llm-tools/embedjs';
import { OpenAi, OpenAiEmbeddings } from '@llm-tools/embedjs-openai';
import { HNSWDb } from '@llm-tools/embedjs-hnswlib';

const llmApplication = await new RAGApplicationBuilder()
    .setModel(new OpenAi({ modelName: 'gpt-4o' }))
    .setEmbeddingModel(new OpenAiEmbeddings())
    .setVectorDb(new HNSWDb())
    .setSearchResultCount(30)
    .build();

await llmApplication.addLoader(new UrlLoader({ url: 'https://github.com/axios/axios#request-config' }));

console.log(await llmApplication.query('Who founded Tesla?'));
