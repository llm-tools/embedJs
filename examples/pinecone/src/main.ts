import 'dotenv/config';
import { RAGApplicationBuilder } from '@llm-tools/embedjs';
import { OpenAiEmbeddings } from '@llm-tools/embedjs-openai';
import { WebLoader } from '@llm-tools/embedjs-loader-web';
import { PineconeDb } from '@llm-tools/embedjs-pinecone';

const llmApplication = await new RAGApplicationBuilder()
    .setEmbeddingModel(new OpenAiEmbeddings())
    .setVectorDatabase(
        new PineconeDb({
            projectName: 'test',
            namespace: 'dev',
            indexSpec: {
                serverless: {
                    cloud: 'aws',
                    region: 'us-east-1',
                },
            },
        }),
    )
    .build();

await llmApplication.addLoader(new WebLoader({ urlOrContent: 'https://en.wikipedia.org/wiki/Tesla,_Inc.' }));
console.log(await llmApplication.query('Who founded Tesla?'));
