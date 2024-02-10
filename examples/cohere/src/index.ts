import 'dotenv/config';
import * as path from 'node:path';
import { fileURLToPath } from 'url';

import { RAGApplicationBuilder, PdfLoader, WebLoader, YoutubeLoader } from '../../../src/index.js';
import { CohereEmbeddings } from '../../../src/embeddings/cohere-embeddings.js';
import { LanceDb } from '../../../src/vectorDb/lance-db.js';

const __filename = fileURLToPath(import.meta.url);
const llmApplication = await new RAGApplicationBuilder()
    .setEmbeddingModel(new CohereEmbeddings())
    .addLoader(new PdfLoader({ url: 'https://lamport.azurewebsites.net/pubs/paxos-simple.pdf' }))
    .addLoader(new YoutubeLoader({ videoIdOrUrl: 'https://www.youtube.com/watch?v=w2KbwC-s7pY' }))
    .addLoader(new WebLoader({ url: 'https://adhityan.com/' }))
    .setVectorDb(new LanceDb({ path: path.resolve(path.dirname(__filename), '../../../db') }))
    .build();

console.log(await llmApplication.query('What is paxos?'));
// Paxos is an algorithm for implementing a fault-tolerant distributed system. It assumes a network of processes, each of which plays the role of proposer, acceptor, and learner. The algorithm chooses a leader, which plays the roles of the distinguished proposer and learner. The algorithm is used to reach consensus on a chosen value, and is obtained by the straightforward application of consensus to the state machine approach for building a distributed system.

console.log(await llmApplication.query('Why Does the M2 Mac Pro Exist?'));
// The Mac Pro exists to provide users with access to PCI slots, as well as other unique features such as its design and performance capabilities.

console.log(await llmApplication.query('Who is Adhityan?'));
// Adhityan is a programmer, entrepreneur, and architect who is the Director of Engineering at Shift and has a presence on LinkedIn, GitHub, and Angel.co.
