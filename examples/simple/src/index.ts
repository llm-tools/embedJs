import 'dotenv/config';

import { RAGApplicationBuilder, WebLoader, YoutubeLoader, SitemapLoader } from '../../../src/index.js';
import { HNSWDb } from '../../../src/vectorDb/hnswlib-db.js';

const llmApplication = await new RAGApplicationBuilder().setSearchResultCount(30).setVectorDb(new HNSWDb()).build();

llmApplication.addLoader(new YoutubeLoader({ videoIdOrUrl: 'pQiT2U5E9tI' }));
llmApplication.addLoader(new SitemapLoader({ url: 'https://tesla-info.com/sitemap.xml' }));
llmApplication.addLoader(new WebLoader({ url: 'https://en.wikipedia.org/wiki/Tesla,_Inc.' }));

console.log((await llmApplication.query('Who founded Tesla?')).result);
// The founder of Tesla is Elon Musk. He co-founded the company with JB Straubel, Martin Eberhard, Marc Tarpenning, and Ian Wright in 2003. Elon Musk is also the CEO of SpaceX and Neuralink.

console.log((await llmApplication.query('Tell me about the history of Tesla?')).result);
// Tesla, Inc. was founded in 2003 by Martin Eberhard and Marc Tarpenning with the goal of creating electric vehicles that could compete with traditional gasoline-powered cars. Elon Musk led the company's Series A financing round in February 2004, and has since played a significant role in the company's development.
// The company's first vehicle, the Tesla Roadster, was released in 2008. It was the first highway-legal all-electric vehicle to use lithium-ion battery cells, and could travel 245 miles (394 km) on a single charge. The Roadster was followed by the Model S, a full-sized luxury sedan, in 2012. The Model S was the world's best-selling plug-in electric vehicle in 2015 and 2016.
// In 2015, Tesla released the Model X, a mid-size luxury SUV, and in 2017, it began production of the Model 3, a four-door sedan aimed at the mass market. The Model 3 became the world's best-selling electric vehicle in 2018. Tesla also produces the Tesla Semi, a Class 8 semi-truck, and the Tesla Cybertruck, a full

console.log((await llmApplication.query('What cars does Tesla have')).result);
// Tesla currently offers six vehicle models: Model S, Model X, Model 3, Model Y, Tesla Semi, and Cybertruck. The first-generation Tesla Roadster is no longer sold, but Tesla has plans for a second-generation Roadster. Tesla also has joint projects with Mercedes, Toyota, and Smart.
