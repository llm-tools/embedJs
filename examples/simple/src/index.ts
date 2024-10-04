import 'dotenv/config';
import { RAGApplicationBuilder } from '@llm-tools/embedjs';
import { OpenAi, OpenAi3SmallEmbeddings } from '@llm-tools/embedjs-openai';
import { LanceDb } from '@llm-tools/embedjs-lancedb';
import { WebLoader } from '@llm-tools/embedjs-loader-web';

const ragApplication = await new RAGApplicationBuilder()
    .setTemperature(0.1)
    .setModel(new OpenAi({ modelName: 'gpt-4o' }))
    .setEmbeddingModel(new OpenAi3SmallEmbeddings())
    .setEmbeddingRelevanceCutOff(0.23)
    .setVectorDb(
        new LanceDb({
            path: './lmdb',
        }),
    )
    .build();

await ragApplication.addLoader(
    new WebLoader({
        urlOrContent:
            'https://edition.cnn.com/2024/10/04/politics/barack-obama-kamala-harris-campaign-events/index.html',
    }),
);

console.log(await ragApplication.query('What did Barack Obama say about Kamala Harris?'));
