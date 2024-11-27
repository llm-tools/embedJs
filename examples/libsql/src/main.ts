import 'dotenv/config';
import path from 'node:path';
import { RAGApplicationBuilder, SIMPLE_MODELS } from '@llm-tools/embedjs';
import { LibSqlDb, LibSqlStore } from '@llm-tools/embedjs-libsql';
import { OpenAiEmbeddings } from '@llm-tools/embedjs-openai';
import { WebLoader } from '@llm-tools/embedjs-loader-web';

const databasePath = path.resolve('./examples/libsql/data.db');
const ragApplication = await new RAGApplicationBuilder()
    .setStore(new LibSqlStore({ path: databasePath }))
    .setVectorDatabase(new LibSqlDb({ path: databasePath }))
    .setEmbeddingModel(new OpenAiEmbeddings())
    .setModel(SIMPLE_MODELS.OPENAI_GPT4_O)
    .build();

await ragApplication.deleteConversation('default');
await ragApplication.addLoader(new WebLoader({ urlOrContent: 'https://en.wikipedia.org/wiki/Elon_Musk' }));
console.log(await ragApplication.query('Was Elon Musk the founder of Tesla originally?'));
console.log(await ragApplication.query('What is the net worth of Elon Musk today?'));
console.log('Embeddings count', await ragApplication.getEmbeddingsCount());

// await ragApplication.deleteLoader('WebLoader_1eab8dd1ffa92906f7fc839862871ca5');
// console.log('Embeddings count', await ragApplication.getEmbeddingsCount());

// await ragApplication.reset();
// console.log('Embeddings count', await ragApplication.getEmbeddingsCount());
