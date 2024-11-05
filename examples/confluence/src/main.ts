import 'dotenv/config';
import { RAGApplicationBuilder } from '@llm-tools/embedjs';
import { OpenAi, OpenAiEmbeddings } from '@llm-tools/embedjs-openai';
import { ConfluenceLoader } from '@llm-tools/embedjs-loader-confluence';
import { HNSWDb } from '@llm-tools/embedjs-hnswlib';

const llmApplication = await new RAGApplicationBuilder()
    .setModel(new OpenAi({ modelName: 'gpt-4o' }))
    .setEmbeddingModel(new OpenAiEmbeddings())
    .setVectorDatabase(new HNSWDb())
    .build();

await llmApplication.addLoader(new ConfluenceLoader({ spaceNames: ['DEMO'] }));
console.log(await llmApplication.query('Who founded Tesla?'));
