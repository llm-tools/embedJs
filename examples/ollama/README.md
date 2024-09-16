## Requirements

This example consists of a Node.js application that uses vector embeddings with `embedJs` RAG library to store text from various sources to database, retrieve them with similarity search and interpret with Ollama LLM.

Main motivation is on the open-source and local running of the RAG application.

### Install NodeJS dependencies

```bash
npm install
```

### Tesla example

You have to had installed ollama ([https://ollama.com/](https://ollama.com/)) and run at least once:

```bash
ollama run llama3
```

Run the "Tesla text" retrieval simple example with default parameters:

```bash
npm start -- llama3
```

That will output similarity search results interpreted by local Ollama llama3 LLM after the content has been first retrieved from internet and indexed to the in-memory vector database.
