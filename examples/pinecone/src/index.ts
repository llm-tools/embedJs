import 'dotenv/config';
import * as path from 'node:path';
import { fileURLToPath } from 'url';

import {
    LLMApplicationBuilder,
    LmdbCache,
    PdfLoader,
    PineconeDb,
    TextLoader,
    YoutubeLoader,
} from '../../../src/index.js';

const __filename = fileURLToPath(import.meta.url);
const llmApplication = await new LLMApplicationBuilder()
    .addLoader(new PdfLoader({ filePath: path.resolve('../paxos-simple.pdf') }))
    .addLoader(new YoutubeLoader({ videoIdOrUrl: 'https://www.youtube.com/watch?v=w2KbwC-s7pY' }))
    .addLoader(new TextLoader({ text: 'The best company name for a company making colorful socks is MrSocks' }))
    .setCache(new LmdbCache({ path: path.resolve(path.dirname(__filename), '../../../cache') }))
    .setVectorDb(new PineconeDb({ projectName: 'test', namespace: 'dev' }))
    .build();

console.log(await llmApplication.query('What is paxos?'));
// Paxos is an algorithm for implementing a fault-tolerant distributed system. It assumes a network of processes, each of which plays the role of proposer, acceptor, and learner. The algorithm chooses a leader, which plays the roles of the distinguished proposer and learner. The algorithm is used to reach consensus on a chosen value, and is obtained by the straightforward application of consensus to the state machine approach for building a distributed system.

// console.log(await llmApplication.query('Why Does the M2 Mac Pro Exist?'));
// The Mac Pro exists to provide users with a powerful and expandable workstation-class computer.

// console.log(await llmApplication.query('What is the best name for a company making colorful socks?'));
// MrSocks
