# @llm-tools/embedjs-minimax

MiniMax model provider for [EmbedJs](https://github.com/llm-tools/embedjs).

## Installation

```bash
npm install @llm-tools/embedjs-minimax
```

## Usage

```typescript
import { MiniMax } from '@llm-tools/embedjs-minimax';

// Uses MINIMAX_API_KEY env var by default
const model = new MiniMax({
    modelName: 'MiniMax-M2.7', // default
});

// Or pass API key directly
const model = new MiniMax({
    apiKey: 'your-api-key',
    modelName: 'MiniMax-M2.7-highspeed',
    temperature: 0.7,
});
```

### Available Models

| Model | Context Window | Description |
|-------|---------------|-------------|
| `MiniMax-M2.7` | 204K tokens | Latest flagship model (default) |
| `MiniMax-M2.7-highspeed` | 204K tokens | Fast variant for latency-sensitive use |

### With RAG Application

```typescript
import { RAGApplicationBuilder } from '@llm-tools/embedjs';
import { MiniMax } from '@llm-tools/embedjs-minimax';
import { OpenAiEmbeddings } from '@llm-tools/embedjs-openai';

const app = await new RAGApplicationBuilder()
    .setModel(new MiniMax({ modelName: 'MiniMax-M2.7' }))
    .setEmbeddingModel(new OpenAiEmbeddings())
    .build();
```

## Configuration

Set the `MINIMAX_API_KEY` environment variable or pass `apiKey` in the constructor.

Get your API key at [MiniMax Platform](https://platform.minimaxi.com/).
