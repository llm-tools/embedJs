import 'dotenv/config';
import { RAGApplicationBuilder } from '@llm-tools/embedjs';
import { OpenAi, OpenAiEmbeddings } from '@llm-tools/embedjs-openai';
import { HNSWDb } from '@llm-tools/embedjs-hnswlib';
import { MarkdownLoader } from '@llm-tools/embedjs-loader-markdown';

const llmApplication = await new RAGApplicationBuilder()
    .setModel(new OpenAi({ modelName: 'gpt-4o' }))
    .setEmbeddingModel(new OpenAiEmbeddings())
    .setVectorDatabase(new HNSWDb())
    .build();

await llmApplication.addLoader(
    new MarkdownLoader({
        filePathOrUrl:
            'https://raw.githubusercontent.com/llm-tools/embedJs/refs/heads/main/docs/get-started/introduction.mdx',
    }),
);
console.log(await llmApplication.query('How do you create an embedJs application?'));
