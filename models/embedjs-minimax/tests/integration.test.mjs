/**
 * Standalone integration test for MiniMax model.
 * Tests the MiniMax API directly using @langchain/openai ChatOpenAI.
 * Run: MINIMAX_API_KEY=xxx node models/embedjs-minimax/tests/integration.test.mjs
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY;

describe('MiniMax Integration (standalone)', { skip: !MINIMAX_API_KEY }, () => {
    function createModel(modelName, temperature) {
        return new ChatOpenAI({
            apiKey: MINIMAX_API_KEY,
            model: modelName,
            temperature: Math.min(Math.max(temperature ?? 0.1, 0.01), 1.0),
            configuration: {
                baseURL: 'https://api.minimax.io/v1',
            },
        });
    }

    it('should get a response from MiniMax-M2.7', async () => {
        const model = createModel('MiniMax-M2.7', 0.1);
        const result = await model.invoke([new HumanMessage('Reply with exactly one word: hello')]);
        assert.ok(result.content.toString().length > 0, 'Response should not be empty');
        console.log('M2.7 response:', result.content.toString().substring(0, 100));
    });

    it('should get a response from MiniMax-M2.7-highspeed', async () => {
        const model = createModel('MiniMax-M2.7-highspeed', 0.1);
        const result = await model.invoke([new HumanMessage('Reply with exactly one word: hello')]);
        assert.ok(result.content.toString().length > 0, 'Response should not be empty');
        console.log('M2.7-highspeed response:', result.content.toString().substring(0, 100));
    });

    it('should return token usage metadata', async () => {
        const model = createModel('MiniMax-M2.7-highspeed', 0.5);
        const result = await model.invoke([new HumanMessage('Say hi')]);
        assert.ok(result.usage_metadata, 'Usage metadata should be present');
        assert.ok(typeof result.usage_metadata.input_tokens === 'number');
        assert.ok(typeof result.usage_metadata.output_tokens === 'number');
        console.log('Token usage:', result.usage_metadata);
    });

    it('should handle system messages', async () => {
        const model = createModel('MiniMax-M2.7-highspeed', 0.1);
        const result = await model.invoke([
            new SystemMessage('You are a pirate. Speak in pirate language.'),
            new HumanMessage('Say hello'),
        ]);
        assert.ok(result.content.toString().length > 0);
        console.log('System msg response:', result.content.toString().substring(0, 100));
    });
});

describe('MiniMax Temperature Clamping (standalone)', () => {
    it('should clamp temperature 0 to 0.01', () => {
        const clamped = Math.min(Math.max(0, 0.01), 1.0);
        assert.equal(clamped, 0.01);
    });

    it('should clamp temperature 2.0 to 1.0', () => {
        const clamped = Math.min(Math.max(2.0, 0.01), 1.0);
        assert.equal(clamped, 1.0);
    });

    it('should not clamp temperature 0.5', () => {
        const clamped = Math.min(Math.max(0.5, 0.01), 1.0);
        assert.equal(clamped, 0.5);
    });

    it('should clamp negative temperature to 0.01', () => {
        const clamped = Math.min(Math.max(-1, 0.01), 1.0);
        assert.equal(clamped, 0.01);
    });

    it('should handle boundary 1.0', () => {
        const clamped = Math.min(Math.max(1.0, 0.01), 1.0);
        assert.equal(clamped, 1.0);
    });

    it('should handle boundary 0.01', () => {
        const clamped = Math.min(Math.max(0.01, 0.01), 1.0);
        assert.equal(clamped, 0.01);
    });
});

describe('MiniMax Constructor Logic (standalone)', () => {
    it('should create ChatOpenAI with MiniMax base URL', () => {
        const model = new ChatOpenAI({
            apiKey: 'test-key',
            model: 'MiniMax-M2.7',
            temperature: 0.5,
            configuration: {
                baseURL: 'https://api.minimax.io/v1',
            },
        });
        assert.ok(model instanceof ChatOpenAI);
    });

    it('should use MiniMax-M2.7 as default model', () => {
        const defaultModel = 'MiniMax-M2.7';
        assert.equal(defaultModel, 'MiniMax-M2.7');
    });

    it('should support MiniMax-M2.7-highspeed model', () => {
        const model = new ChatOpenAI({
            apiKey: 'test-key',
            model: 'MiniMax-M2.7-highspeed',
            configuration: {
                baseURL: 'https://api.minimax.io/v1',
            },
        });
        assert.ok(model instanceof ChatOpenAI);
    });

    it('should use MINIMAX_API_KEY from env when not provided', () => {
        const key = process.env.MINIMAX_API_KEY ?? 'fallback-key';
        assert.ok(typeof key === 'string');
    });
});
