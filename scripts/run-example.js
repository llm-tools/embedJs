#!/usr/bin/env node

import { execSync } from 'child_process';

const taskName = process.argv[2];

if (!taskName) {
    console.error('❌ Error: Please specify an example name');
    console.error('Usage: npm run example <example-name>');
    console.error('\nAvailable examples:');
    console.error('  - confluence');
    console.error('  - dynamic');
    console.error('  - image');
    console.error('  - libsql');
    console.error('  - markdown');
    console.error('  - pinecone');
    console.error('  - simple');
    process.exit(1);
}

const projectName = `examples-${taskName}`;
console.log(`🚀 Running example: ${taskName}`);
console.log(`📦 Project: ${projectName}\n`);

try {
    execSync(`npx nx run ${projectName}:serve`, { stdio: 'inherit' });
} catch (error) {
    console.error(`\n❌ Failed to run example: ${taskName}`);
    console.error('Make sure the example exists and the project name is correct.');
    console.error('Error:', error.message);
    process.exit(1);
}
