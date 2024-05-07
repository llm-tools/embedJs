## Requirements

This example consists of a Python Flask application that handles text embeddings and a Node.js application that uses these embeddings with `embedJs` RAG library.

Main emphasis is on open-source and local running of the RAG application.


### Install NodeJS dependencies

```bash
npm install
```

**WSL note**

After reinstalling the dependencies, force a rebuild of all native modules to be sure they're compatible with your Linux environment under WSL:

```bash
npm rebuild --update-binary
```

### Install Python dependencies

To run verctor embedding server with models supported by `SentenceTransformer`:

```bash
pip install -r requirements.txt
```

Be prepared to upgrade some libraries, like huggingface_hub:

```bash
pip3 install sentence_transformers --upgrade
```

### Usage

To run the full application (both Flask and Node.js apps), execute the following commands.

Simple start up script run with the default parameters:

```bash
python server.py
```

#### Configurations

Windows:

```bash
$env:FLASK_RUN_PORT="5000"; python server.py --model "all-MiniLM-L6-v2" --port 5000
```

Linux/Mac:

```bash
FLASK_RUN_PORT=5000 python server.py --model "all-MiniLM-L6-v2" --port 5000 &
```

Above line starts embedding server as a background service and needs to be killed manually after running the example.

```bash
$ sudo lsof -i :5000
```

->

```bash
$ sudo kill portNumber
```

### Tesla example

You have to had installed ollama ([https://ollama.com/](https://ollama.com/)) and run at least once:

```bash
ollama run llama3
```

Run the "Tesla text" retrieval simple example with default parameters:

```bash
npm start
```

#### Configurations

```bash
npm start -- "llama3" "http://localhost:5000/embed" 384
```

That will output similarity search results interpereted by local Ollama llama3 LLM after the content has been first retrieved from internet and indexed to the in-memory vector database.
