import { RAGApplicationBuilder } from '@llm-tools/embedjs';
import { PineconeDb } from '@llm-tools/embedjs-pinecone';
import { WebLoader } from 'loaders/embedjs-loader-web/src/web-loader.js';

const llmApplication = await new RAGApplicationBuilder()
    .setVectorDb(
        new PineconeDb({
            projectName: 'test',
            namespace: 'dev',
            indexSpec: {
                pod: {
                    podType: 'p1.x1',
                    environment: 'us-east1-gcp',
                },
            },
        }),
    )
    .build();

await llmApplication.addLoader(new WebLoader({ urlOrContent: 'https://en.wikipedia.org/wiki/Tesla,_Inc.' }));

console.log(await llmApplication.query('Who founded Tesla?'));
