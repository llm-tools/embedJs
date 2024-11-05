import 'dotenv/config';
import { LocalPathLoader, RAGApplicationBuilder } from '@llm-tools/embedjs';
import { OpenAi, OpenAiEmbeddings } from '@llm-tools/embedjs-openai';
import { HNSWDb } from '@llm-tools/embedjs-hnswlib';

const llmApplication = await new RAGApplicationBuilder()
    .setModel(new OpenAi({ modelName: 'gpt-4o' }))
    .setEmbeddingModel(new OpenAiEmbeddings())
    .setVectorDatabase(new HNSWDb())
    .build();

await llmApplication.addLoader(new LocalPathLoader({ path: './docs/get-started/quickstart.mdx' }));
console.log(await llmApplication.query('How do you create an embedJs application?'));
