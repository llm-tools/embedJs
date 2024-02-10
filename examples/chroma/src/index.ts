import 'dotenv/config';

import { RAGApplicationBuilder, PdfLoader, WebLoader } from '../../../src/index.js';
import { ChromaDb } from '../../../src/vectorDb/chroma-db.js';

const llmApplication = await new RAGApplicationBuilder()
    .setSearchResultCount(30)
    .setVectorDb(new ChromaDb({ url: 'http://localhost:8000' }))
    .addLoader(new PdfLoader({ url: 'https://lamport.azurewebsites.net/pubs/paxos-simple.pdf' }))
    .addLoader(new WebLoader({ url: 'https://adhityan.com/' }))
    .build();

console.log(await llmApplication.query('What is paxos?'));
// Paxos is an algorithm for implementing a fault-tolerant distributed system. It assumes a network of processes, each of which plays the role of proposer, acceptor, and learner. The algorithm chooses a leader, which plays the roles of the distinguished proposer and learner. The algorithm is used to reach consensus on a chosen value, and is obtained by the straightforward application of consensus to the state machine approach for building a distributed system.

console.log(await llmApplication.query('Who is Adhityan?'));
// Adhityan is a programmer, entrepreneur, and architect who is the Director of Engineering at Shift and has a presence on LinkedIn, GitHub, and Angel.co.
