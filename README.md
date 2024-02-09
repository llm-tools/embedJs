# EmbedJs

<p>
<a href="https://www.npmjs.com/package/@@llm-tools/embedjs"  target="_blank">
<img alt="NPM Version" src="https://img.shields.io/npm/v/%40llm-tools/embedjs">
</a>

<a href="https://www.npmjs.com/package/@llm-tools/embedjs"  target="_blank">
<img alt="License" src="https://img.shields.io/npm/l/%40llm-tools%2Fembedjs">
</a>
</p>

EmbedJs is a NodeJS framework that simplifies RAG application development by efficiently processing unstructured data. It segments data, creates relevant embeddings, and stores them in a vector database for quick retrieval.

Here's an example of how easy it is to get started -

```TS
const ragApplication = await new RAGApplicationBuilder()
    .addLoader(new YoutubeSearchLoader({ searchString: 'Tesla cars' }))
    .addLoader(new SitemapLoader({ url: 'https://tesla-info.com/sitemap.xml' }))
    .addLoader(new WebLoader({ url: 'https://en.wikipedia.org/wiki/Tesla,_Inc.' }))
    .setVectorDb(new LanceDb({ path: '.db' }))
    .build();
```

That's it. Now you can ask questions -

```TS
console.log(await ragApplication.query('Tell me about the history of Tesla?'));
```

## Features

-   Supports several large language models

-   Supports many vector databases including self-hosted and cloud variants.

-   Load different kinds of unstructured data. Comes built in with several loaders that makes this easy.

-   Supports several cache options that can greatly improve the performance of your RAG applications in production.

-   EmbedJs's simple and powerful API allows both quick launch and deep customizabilty.

## Quick note

The author(s) are looking to add core maintainers for this opensource project. Reach out on [Linkedin](https://www.linkedin.com/in/adhityan/) if you are interested. If you want to contribute in general - create issues on GitHub or send in PRs.

# Contents

-   [Getting started](#getting-started)
    -   [Installation](#installation)
    -   [Usage](#usage)
    -   [Temperature](#temperature)
    -   [Search results count](#search-results-count)
    -   [Customize the prompt](#customize-the-prompt)
    -   [Dry run](#get-context)
-   [Loaders supported](#loaders-supported)
    -   [PDF](#pdf-file)
    -   [Youtube](#youtube-video)
    -   [Youtube channels](#youtube-channel)
    -   [Youtube search](#youtube-search)
    -   [Web page](#web-page)
    -   [Confluence](#confluence)
    -   [Sitemap](#sitemap)
    -   [Text](#text)
    -   [Custom loader](#add-a-custom-loader)
    -   [How to request more loaders](#more-loaders-coming-soon)
-   [LLMs](#llms)
    -   [OpenAI](#openai)
    -   [Mistral](#mistral)
    -   [Hugging Face](#hugging-face)
    -   [Azure OpenAI](#azure-openai)
    -   [Bring your own LLMs](#use-custom-llm-model)
    -   [Request support for new LLMs](#more-llms-coming-soon)
-   [Embedding Models](#embedding-models)
    -   [OpenAI v3 Small](#openai-v3-small)
    -   [OpenAI v3 Large](#openai-v3-large)
    -   [ADA](#ada)
    -   [Cohere](#cohere)
    -   [Custom embedding models](#use-custom-embedding-model)
    -   [Request support for embedding models](#more-embedding-models-coming-soon)
-   [Vector databases supported](#vector-databases-supported)
    -   [Pinecone](#pinecone)
    -   [LanceDB](#lancedb)
    -   [Chroma](#chroma)
    -   [HNSWLib](#hnswlib)
    -   [Weaviate](#weaviate)
    -   [Own Database](#bring-your-own-database)
    -   [How to request new vector databases](#more-databases-coming-soon)
-   [Caches](#caches)
    -   [Redis](#redis)
    -   [LMDB File](#lmdb)
    -   [In memory cache](#inmemory)
    -   [Custom cache implementation](#bring-your-own-cache)
    -   [How to request new cache providers](#more-caches-coming-soon)
-   [Sample projects](#sample-projects)
-   [Contributors](#contributors)

# Getting started

## Installation

You can install the library via NPM or Yarn

```bash
npm i @llm-tools/embedjs
```

**Note:** The library uses the newer ES6 modules and `import` syntax.

## Usage

To configure a new EmbedJs application, you need to do three steps -

> **1. Pick an LLM**<br/>
> The library supports several LLMs. Activate one by allowing the instructions in the [LLM](#llms) section.

```TS
const ragApplication = await new RAGApplicationBuilder()
    .setModel(new HuggingFace({ modelName: 'mistralai/Mixtral-8x7B-v0.1' }))
    ...
```

> **2. Pick a Vector database**<br/>
> The library supports several vector databases. Enable one by allowing the instructions in the [Vector Databases](#vector-databases-supported) section.

```TS
    .setVectorDb(new PineconeDb({ projectName: 'test', namespace: 'dev' }))
```

> **3. Load some data**<br/>
> The library supports several kinds of loaders. You can use zero, one or many kinds of loaders together to import custom knowledge. Read the [loaders](#loaders-supported) section to learn more about the different supported loaders.

```TS
    .addLoader(new YoutubeSearchLoader({ searchString: 'Tesla cars' }))
    .addLoader(new SitemapLoader({ url: 'https://tesla-info.com/sitemap.xml' }))
    .build();
```

That's it! Now that you have your instance of `RAGApplication`, you can use it to query against the loaded data sets, like so -

```TS
await ragApplication.query('What is Tesla?');
```

## Temperature

The temperature is a number between 0 and 1. It governs the randomness and creativity of the LLM responses. Higher values like 0.8 will make the output more random, while lower values like 0.2 will make it more focused and deterministic. You can alter it by -

```TS
await new RAGApplicationBuilder()
.setTemperature(0.1)
```

**NOTE:** The default value is 0.1, which makes the GPT responses very precise.

## Search results count

This is the number of documents to aim for when retrieving results from the vector database. A high number of results might mean there is more non-relevant data in the context. A low number might mean none of the relevant documents are retrieved. You need to set the number that works best for you. The parameter can be altered by -

```TS
await new RAGApplicationBuilder()
.setSearchResultCount(10)
```

**NOTE:** The default value is 7.

It is important to note that the library does not simply dump all contextual document chunks into the prompt. It sends them to the model marking them as context documents. The number of documents still counts toward the token limit.

When the number of documents fetched leads to a request above the token limit, the library uses the following strategy -

> It runs a preprocessing step to select relevant sections from each document until the total number of tokens is less than the maximum number of tokens allowed by the model. It then uses the transformed documents as context to answer the question.

## Customize the prompt

LLM models need some care. The models are notorious for inventing responses when they don't know the answer. Keeping this in mind, the library auto adds a wrapper to all user queries. The default prompt is -

> Use all the provided context to answer the query at the end. Answer in full. If you don't know the answer, just say that you don't know, don't try to make up an answer. Query: {0}

The placeholder `{0}` is replaced with the input query. In some cases, you may want to customize this prompt. This can be done with ease by -

```TS
await new RAGApplicationBuilder()
.QueryTemplate('My own query template')
```

## Get context (dry run)

During development, you may want to test the performance and quality of the `Loaders` you have enabled without making any LLM calls. You can do this by using the `getContext` method -

```TS
await ragApplication.getContext('What is Steve Jobs?')
```

## Get count of embedded chunks

You can fetch the count of embeddedings stored in your vector database at any time by calling the `getEmbeddingsCount` method -

```TS
await ragApplication.getEmbeddingsCount()
```

# Loaders supported

Loaders take a specific format, process the input and create chunks of the data. Currently, the library supports the following formats -

## Youtube video

To add any youtube video to your app, use `YoutubeLoader`.

```TS
.addLoader(new YoutubeLoader({ videoIdOrUrl: 'w2KbwC-s7pY' }))
```

## Youtube channel

To add all videos in a youtube channel, use `YoutubeChannelLoader`.

```TS
.addLoader(new YoutubeChannelLoader({ channelId: '...' }))
```

## Youtube search

To do a general youtube search and add the popular search results, use `YoutubeSearchLoader`.

```TS
.addLoader(new YoutubeSearchLoader({ searchString: '...' }))
```

## PDF file

To add a pdf file, use `PdfLoader`. You can add a local file -

```TS
.addLoader(new PdfLoader({ filePath: path.resolve('paxos-simple.pdf') }))
```

Or, you can add a remote file -

```TS
.addLoader(new PdfLoader({ url: 'https://lamport.azurewebsites.net/pubs/paxos-simple.pdf' }))
```

By default, the PdfLoader uses the hash of the filePath or the Url as the loader cache key. In some cases, like when using dynamic files with the same name, you can pass in your own custom uniqueId like so -

```TS
.addLoader(new PdfLoader({ url: '<URL>', , uniqueId: 'MY_UNIQUE_ID' }))
```

**Note:** Currently there is no support for PDF forms and password protected documents

## Web page

To add a web page, use `WebLoader`.

```TS
.addLoader(new WebLoader({ url: 'https://en.wikipedia.org/wiki/Formula_One' }))
```

## Confluence

To add a confluence space, use `ConfluenceLoader`.

```TS
.addLoader(new ConfluenceLoader({ spaceNames: ['...'] }))
```

You also need to set the following environment variables -

```bash
CONFLUENCE_BASE_URL=<your space base url>
CONFLUENCE_USER_NAME=<your email id or username>
CONFLUENCE_API_TOKEN=<your personal or bot access token>
```

**Note:** The confluence space name is the value you see in the url in the space overview page `/wiki/spaces/{{ space name }}/overview`.

## Sitemap

To add a XML sitemap, use `SitemapLoader`.

```TS
.addLoader(new SitemapLoader({ url: '...' }))
```

This will load all URLs in a sitemap via the WebLoader.

## Text

To supply your own text, use `TextLoader`.

```TS
.addLoader(new TextLoader({ text: 'The best company name for a company making colorful socks is MrSocks' }))
```

**Note:** Feel free to add your custom text without worrying about duplication. The library will chuck, cache and update the vector databases.

## Add a custom loader

You can pass along a custom loader to the `addLoader` method by extending and implementing the abstract class `BaseLoader`. Here's how that would look like -

```TS
class CustomLoader extends BaseLoader<{ customChunkMetadata: string }> {
    constructor() {
        super('uniqueId');
    }

    async *getChunks() {
        throw new Error('Method not implemented.');
    }
}
```

We really encourage you send in a PR to this library if you are implementing a common loader pattern, so the community can benefit from it.

## More loaders coming soon

If you want to add any other format, please create an [issue](https://github.com/llm-tools/embedjs/issues) and we will add it to the list of supported formats. All PRs are welcome.

# LLMs

It's relatively easy to switch between different LLMs using the library. We support the following LLMs today -

## OpenAI

To use the OpenAI LLM models, you need a API key from OpenAI. You can alternatively use Azure OpenAI to run these models. Read the [Azure OpenAI](#azure-openai) section below to learn more about this. In this section, we will cover how to use OpenAI provided LLMs.

The first step is to obtain an API Key from OpenAI. You can do this by visiting their [API Portal](https://platform.openai.com/api-keys). Once you obtain a key, set it as an environment variable, like so -

```bash
OPENAI_API_KEY="<Your key>"
```

Once this is done, it is relatively easy to run OpenAI LLMs. All you need is to indicate the model type you want to run.

-   For GPT 3.5 Turbo

```TS
const ragApplication = await new RAGApplicationBuilder()
.setModel(SIMPLE_MODELS.OPENAI_GPT3_TURBO)
```

-   For GPT 4

```TS
const ragApplication = await new RAGApplicationBuilder()
.setModel(SIMPLE_MODELS.OPENAI_GPT4)
```

-   To use a custom model name

```TS
const ragApplication = await new RAGApplicationBuilder()
.setModel(new OpenAi({ modelName: 'gpt-4' }))
```

**Note:** GPT 3.5 Turbo is used as the default model if you do not specifiy one.

## Mistral

To use Mirstal's models, you will need to get an API Key from Mistral. You can do this from their [console](https://console.mistral.ai/user/api-keys/). Once you have obtained a key, set Mistral as your LLM of choice -

```TS
const ragApplication = await new RAGApplicationBuilder()
.setModel(new Mistral({ accessToken: "<YOUR_MISTRAL_TOKEN_HERE>" }))
```

By default, the `mistral-medium` model from Mistral is used. If you want to use a different Mistral model, you can specify it via the optional parameter to the Mistral constructor, like so -

```TS
const ragApplication = await new RAGApplicationBuilder()
.setModel(new Mistral({ accessToken: "<YOUR_MISTRAL_TOKEN_HERE>", modelName: "..." }))
```

**Note:** If you want to run Mistral open source for free, you can do so using the HuggingFace platform (read below). Just make sure to set the modelName to `mistralai/Mistral-7B-v0.1` or the version you want to run.

## Hugging Face

Hugging face needs no introduction. They host a variety of open source LLMs and you can use most of them for free. To run hugging face inference based LLMs with this library, you will need a free hugging face token.

You can get an API Token by signing up for hugging face and generate a token from [this page](https://huggingface.co/settings/tokens). Once you get the token, set it to the environment like so -

```bash
HUGGINGFACEHUB_API_KEY="<Your hf key>"
```

That's all, now you can use any hugging face model. To do this set `HuggingFace` as your model processor of choice -

```TS
const ragApplication = await new RAGApplicationBuilder()
.setModel(new HuggingFace({ modelName: "..." })))
```

**Note:** Not all hugging face models are fully free to consume via their API. Since running these models takes a lot of resources, Hugging Face charges a fee for a few of the larger ones. This is the case with Meta's `meta-llama/Llama-2-7b-hf`, for example.

To use these 'not-free' models via HuggingFace, you need to subscribe to their [Pro plan](https://huggingface.co/pricing) or create a custom [inference endpoint](https://ui.endpoints.huggingface.co/). It is possible to self host these models for free and run them locally via Ollama - support for which is coming soon.

## Azure OpenAI

In order to be able to use an OpenAI model on Azure, it first needs to be deployed. Please refer to [Azure OpenAI documentation](https://learn.microsoft.com/en-us/azure/cognitive-services/openai/) on how to deploy a model on Azure. To run this library, you will need to deploy two models -

-   text-embedding-ada
-   GPT-3.5-turbo (or the 4 series)

Once these models are deployed, using Azure OpenAI instead of the regular OpenAI is easy to do. Just follow these steps -

-   Remove the `OPENAI_API_KEY` environment variable if you have set it already.

-   Set the following environment variables -

```bash
# Set this to `azure`
OPENAI_API_TYPE=azure
# The API version you want to use
AZURE_OPENAI_API_VERSION=2023-05-15
# The base URL for your Azure OpenAI resource.  You can find this in the Azure portal under your Azure OpenAI resource.
export AZURE_OPENAI_BASE_PATH=https://your-resource-name.openai.azure.com/openai/deployments
# The API key1 or key2 for your Azure OpenAI resource
export AZURE_OPENAI_API_KEY=<Your Azure OpenAI API key>
# The deployment name you used for your embedding model
AZURE_OPENAI_API_EMBEDDINGS_DEPLOYMENT_NAME=text-embedding-ada-002
# The deployment name you used for your llm
AZURE_OPENAI_API_DEPLOYMENT_NAME=gpt-35-turbo
```

You can now run the Azure OpenAI LLMs using the [`OpenAi` model](#openai) detailed above.

## Use custom LLM model

You can use a custom LLM model by implementing the `BaseModel` interface. Here's how that would look like -

```TS
class MyOwnLLMImplementation implements BaseModel {
    override async init(): Promise<void> {} //optional to override

    protected abstract runQuery(
        system: string, //the system prompt
        userQuery: string, //the current user query
        supportingContext: Chunk[], //all supporting documents
        pastConversations: ConversationHistory[], //the chat history so far
    ): Promise<string> {
        throw new Error("Method not implemented.");
    }
}
```

Once done, you can pass this class to the `setModel` method like shown in the examples above. That said, we really encourage you send in a PR to this library if you are implementing a famous or common LLM, so the community can benefit from it.

## More LLMs coming soon

If you want us to add support for a specific LLM, please create an [issue](https://github.com/llm-tools/embedjs/issues) and we will prioritize it. All PRs are welcome.

Currently, we next plan to add support for Ollama.

# Embedding models

Embedding models are LLMs that convert a string into vector better suited for processing. In most cases, the default `text-embedding-ada-002` model from OpenAI is going to be good enough. If you want to use this model, you do not have to do anything.

However in some advanced cases, you may want to change this; after all, different embedding models perform differently under different curcumstances. The library allows you to do this using the method `setEmbeddingModel` while building the `RAGApplication`.

The library supports the following embedding models -

## OpenAI v3 Small

The `text-embedding-3-small` is a new standard embedding model released by OpenAI in Jan, 2024. It is the default used by the libary. This model is cheaper and better than their older Ada model. This model returns vectors with dimension 1536.

You do not have to do anything to enable it.

## OpenAI v3 Large

The `text-embedding-3-large` is also a new standard embedding model released by OpenAI in Jan, 2024. This model is the best embedding model provided by OpenAI as of now but is also the most expensive. This model returns vectors with dimension 3072.

To set it as your model of choice -

-   Set `OpenAi3LargeEmbeddings` as your embedding model on `RAGApplicationBuilder`

```TS
await new RAGApplicationBuilder()
.setEmbeddingModel(new OpenAi3LargeEmbeddings())
```

## Ada

The `text-embedding-ada-002` is a well known model from OpenAI. You can read more about it [here](https://openai.com/blog/new-and-improved-embedding-model). This model returns vectors with dimension 1536.

To set it as your model of choice -

-   Set `AdaEmbeddings` as your embedding model on `RAGApplicationBuilder`

```TS
await new RAGApplicationBuilder()
.setEmbeddingModel(new AdaEmbeddings())
```

## Cohere

The library supports usage of [Cohere-AI](https://cohere.com) `embed-english-v2.0` embedding model out of the box. This model returns vectors with dimension 4096.

Here's what you have to do to enable it -

-   Sign up for an account with Cohere-AI if you have not done so already. Once done, go to the [API Keys](https://dashboard.cohere.ai/api-keys) section and copy an API_KEY.

-   Load the key you just obtained in the environment variable `COHERE_API_KEY`

```bash
COHERE_API_KEY="<YOUR_KEY>"
```

-   Set `CohereEmbeddings` as your embedding model on `RAGApplicationBuilder`

```TS
await new RAGApplicationBuilder()
.setEmbeddingModel(new CohereEmbeddings())
```

## Use custom embedding model

You can use your own custom embedding model by implementing the `BaseEmbeddings` interface. Here's how that would look like -

```TS
class MyOwnEmbeddingImplementation implements BaseEmbeddings {
    embedDocuments(texts: string[]): Promise<number[][]> {
        throw new Error("Method not implemented.");
    }

    embedQuery(text: string): Promise<number[]> {
        throw new Error("Method not implemented.");
    }

    getDimensions(): number {
        throw new Error("Method not implemented.");
    }
}
```

Once done, you can pass this class to the `setEmbeddingModel` method like shown in the Cohere example above. That said, we really encourage you send in a PR to this library if you are implementing a famous or common embedding provider, so the community can benefit from it.

## More embedding models coming soon

If you want us to add support for a specific embedding model, please create an [issue](https://github.com/llm-tools/embedjs/issues) and we will prioritize it. All PRs are welcome.

# Vector databases supported

The library allows you to save your processed and unique embeddings with the vector databases of your choice. Here are the supported databases right now -

## Pinecone

You can enable Pinecone storage by following these steps -

-   Create an account with [Pinecone](https://www.pinecone.io/) if you don't have one already. There is a _good free tier_.

-   Install pinecone package in your project

```bash
npm install @pinecone-database/pinecone
```

-   Set the pinecone environment variable `PINECONE_API_KEY`. This can be obtained from the **API Keys** section on the Pinecone dashboard.

```bash
PINECONE_API_KEY=<your api key>
```

-   Set the Pinecone database as your choice of `vectorDb`

```TS
.setVectorDb(new PineconeDb({
    projectName: 'test',
    namespace: 'dev',
    indexSpec: {
        pod: {
            podType: 'p1.x1',
            environment: 'us-east1-gcp',
        },
    },
}))
```

**Note:** Pinecone supports serverless and pod based index deployments. You can control how you want your index created using the indexSpec attribute. This is mandatory to be provided but comes with full type specification. Read more about configuring this [here](https://github.com/pinecone-io/pinecone-ts-client/blob/main/v2-migration.md).

## LanceDB

[LanceDB](https://lancedb.com/) is a local vector database with great performance. Follow these steps to use LanceDB as your vector database -

-   Install LanceDb package in your project

```bash
npm install vectordb
```

-   Set LanceDB database as your choice of `vectorDb`

```TS
.setVectorDb(new LanceDb({ path: path.resolve('/db') }))
```

**Note:** The `path` property will be used by LanceDB to create a directory to host all the database files. There is also support for creating temporary directories for testing -

```TS
.setVectorDb(new LanceDb({ path: 'lance-', isTemp: true }))
```

In this case, the `path` property is used as a prefix to create the temporary directory in the OS temp directory folder.

## Chroma

[Chroma](https://trychroma.com/) is an open source vector database. It's designed to be Python first and to connect to it from NodeJS, you will need to run Chroma in a container following the steps [listed here](https://docs.trychroma.com/getting-started). Once done, follow these steps to use Chroma as your vector database -

-   Install Chroma package in your project

```bash
npm install chromadb
```

-   Set Chroma database as your choice of `vectorDb`

```TS
.setVectorDb(new ChromaDb({ url: 'http://localhost:8000' }))
```

**Note:** This is the default url and port if you run the Chroma docker container using the command `docker-compose up -d --build`.

A warning -

> In our testing, chroma performed the poorest in being able to retrieve relevant documents among the supported vector databases.

## HNSWLib

[HNSWLib](https://github.com/nmslib/hnswlib) is an in-memory vectorstore. It is great for beginners to get started with since you do not need access to the file system or a cloud service. Follow these steps to use HNSWLib as your vector database -

-   Install HNSWLib package in your project

```bash
npm install hnswlib-node
```

-   Set HNSWLib database as your choice of `vectorDb`

```TS
.setVectorDb(new HNSWDb())
```

**Note:** This is a purely in-memory vector store. All values are lost when application is restarted.

## Weaviate

[Weaviate](https://weaviate.io/) is an open source vector store. You can deploy it locally on docker or use their managed cloud offering. Follow these steps to use Weaviate as your vector database -

-   Install Weaviate package in your project

```bash
npm install weaviate-ts-client
```

-   Set Weaviate database as your choice of `vectorDb`

```TS
.setVectorDb(new WeaviateDb({ host: '...', apiKey: '...', className: '...' }))
```

## Bring your own database

You can pass along your vector database to the `setVectorDb` method by implementing the interface `BaseDb`. Here's how that would look like -

```TS
class MyOwnDb implements BaseDb {
    async init({ dimensions }: { dimensions: number }): Promise<void> {
        throw new Error('Method not implemented.');
    }

    async insertChunks(chunks: EmbeddedChunk[]): Promise<number> {
        throw new Error('Method not implemented.');
    }

    async similaritySearch(query: number[], k: number): Promise<Chunk[]> {
        throw new Error('Method not implemented.');
    }

    async getVectorCount(): Promise<number> {
        throw new Error('Method not implemented.');
    }

    async deleteKeys(keys: string[]): Promise<void> {
        throw new Error('Method not implemented.');
    }

    async reset(): Promise<void> {
        throw new Error('Method not implemented.');
    }
}
```

We really encourage you send in a PR to this library if you are implementing a famous or common database, so the community can benefit from it.

## More databases coming soon

If you want to add support for any other vector database, please create an [issue](https://github.com/llm-tools/embedjs/issues) and we will add it to the list of supported databases. All PRs are welcome.

# Caches

Caches serve to reduce re-processing embeddings, loaders and queries. There is no need to load, chunk and store a large PDF File or web page on every run. Caching smartly is built in and can be enabled out of the box simply by setting a cache processor using the method `setCache` while building the `RAGApplication`.

The library supports the following caches -

## LMDB

You can use [LMDB](https://dbdb.io/db/lmdb) to cache values locally on disk.

-   Install LMDB package in your project

```bash
npm install lmdb
```

-   Set `LmdbCache` as your cache provider on `RAGApplicationBuilder`

```TS
await new RAGApplicationBuilder()
.setCache(new LmdbCache({ path: path.resolve('./cache') }))
```

**Note:** The `path` property will be used by the LMDB driver to create a folder housing the LMDB database files.

## InMemory

You can use a simple in-memory cache to store values during testing.

-   Set `MemoryCache` as your cache provider on `RAGApplicationBuilder`

```TS
await new RAGApplicationBuilder()
.setCache(new MemoryCache())
```

**Note:** Although this cache can remove duplicate loaders and chunks, its store does not persist between process restarts. You should only be using it for testing.

## Redis

You can use redis as a cache to store values during testing.

-   Set `RedisCache` as your cache provider on `RAGApplicationBuilder`

```TS
await new RAGApplicationBuilder()
.setCache(new RedisCache({ ... }))
```

**Note:** The library internally uses `IORedis` to work with redis. `RedisCache` constructor supports all `IORedis` constructor parameters. Check [`IORedis` documentation](https://github.com/redis/ioredis) for more detials.

## Bring your own cache

You can pass along your own cache provider to the `setCache` method by implementing the interface `BaseCache`. Here's how that would look like -

```TS
class MyOwnCache implements BaseCache {
    async init(): Promise<void> {
        throw new Error("Method not implemented.");
    }

    async addLoader(loaderId: string, chunkCount: number ): Promise<void> {
        throw new Error("Method not implemented.");
    }

    async getLoader(loaderId: string): Promise<{ chunkCount: number }> {
        throw new Error("Method not implemented.");
    }

    async hasLoader(loaderId: string): Promise<boolean> {
        throw new Error("Method not implemented.");
    }
}
```

We really encourage you send in a PR to this library if you are implementing a famous or common cache provider, so the community can benefit from it.

## More caches coming soon

If you want to add support for any other cache providers, please create an [issue](https://github.com/llm-tools/embedjs/issues) and we will add it to the list of supported caches. All PRs are welcome.

# Langsmith Integration

Langsmith allows you to keep track of how you use LLM and embedding models. It logs histories, token uses and other metadata. Follow these three simple steps to enable -

-   Sign up for an account with [Langsmith](https://smith.langchain.com/)
-   Generate an API Key from your admin page
-   Set the following environment keys in your project

```bash
export LANGCHAIN_TRACING_V2=true
export LANGCHAIN_ENDPOINT="https://api.smith.langchain.com"
export LANGCHAIN_PROJECT="<project name>"
export LANGCHAIN_API_KEY="<api key>"
```

# Sample projects

Here's a list of projects / examples built with RagKit

| **Project**                                                                      | **Description**                                                         |
| -------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| [nestjs-embedjs-template](https://github.com/llm-tools/nestjs-embedjs-template)  | A NestJS server side template                                           |
| [nextjs-chatbot-template](https://github.com/llm-tools/chat-bot-nextjs-template) | A NextJS chat template - including a chat UI                            |
| [slack-bot](https://github.com/llm-tools/slack-bot-template)                     | A slack bot that can answer questions based on learnt confluence spaces |

# Contributors

<a href="https://github.com/llm-tools/embedjs/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=llm-tools/embedjs" />
</a>

<br />

> Want to contribute? That is as easy as forking and sending in a PR!
