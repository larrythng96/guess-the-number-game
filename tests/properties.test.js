import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app, resetGameSession } from '../server.js';

// Simplified integration tests (replacing heavy property-based tests)
// These tests verify core behaviors with reasonable coverage

beforeEach(() => {
  resetGameSession();
});

describe('Integration: Game creation and state retrieval', () => {
  it('should create a game with consistent state', async () => {
    const createRes = await request(app)
      .get('/api/game')
      .query({ numGuessers: 3, maxNumber: 100 });
    expect(createRes.status).toBe(201);

    const stateRes = await request(app).get('/api/state');
    expect(stateRes.status).toBe(200);
    expect(stateRes.body.numGuessers).toBe(3);
    expect(stateRes.body.maxNumber).toBe(100);
    expect(stateRes.body.secretSet).toBe(false);
    expect(stateRes.body.currentPlayer).toBe(1);
  });
});

describe('Integration: Secret setting', () => {
  it('should set secret and update state', async () => {
    await request(app).get('/api/game').query({ numGuessers: 2, maxNumber: 50 });
    
    const secretRes = await request(app).get('/api/secret').query({ secret: 25 });
    expect(secretRes.status).toBe(200);

    const stateRes = await request(app).get('/api/state');
    expect(stateRes.body.secretSet).toBe(true);
  });
});

describe('Integration: Guess feedback accuracy', () => {
  it('should return correct feedback for high, low, and exact guesses', async () => {
    await request(app).get('/api/game').query({ numGuessers: 1, maxNumber: 100 });
    await request(app).get('/api/secret').query({ secret: 50 });

    const highRes = await request(app).get('/api/guess').query({ player: 1, guess: 75 });
    expect(highRes.body.result).toBe('too_high');

    resetGameSession();
    await request(app).get('/api/game').query({ numGuessers: 1, maxNumber: 100 });
    await request(app).get('/api/secret').query({ secret: 50 });

    const lowRes = await request(app).get('/api/guess').query({ player: 1, guess: 25 });
    expect(lowRes.body.result).toBe('too_low');

    resetGameSession();
    await request(app).get('/api/game').query({ numGuessers: 1, maxNumber: 100 });
    await request(app).get('/api/secret').query({ secret: 50 });

    const exactRes = await request(app).get('/api/guess').query({ player: 1, guess: 50 });
    expect(exactRes.body.result).toBe('correct');
  });
});

describe('Integration: Turn rotation', () => {
  it('should rotate turns between players correctly', async () => {
    await request(app).get('/api/game').query({ numGuessers: 3, maxNumber: 100 });
    await request(app).get('/api/secret').query({ secret: 99 });

    let currentPlayer = 1;
    for (let i = 0; i < 6; i++) {
      const res = await request(app)
        .get('/api/guess')
        .query({ player: currentPlayer, guess: 10 + i });
      expect(res.status).toBe(200);
      
      const expectedNext = (currentPlayer % 3) + 1;
      expect(res.body.nextPlayer).toBe(expectedNext);
      currentPlayer = expectedNext;
    }
  });
});

describe('Integration: Win detection', () => {
  it('should correctly identify winner and mark game complete', async () => {
    await request(app).get('/api/game').query({ numGuessers: 2, maxNumber: 100 });
    await request(app).get('/api/secret').query({ secret: 42 });

    const res = await request(app).get('/api/guess').query({ player: 1, guess: 42 });
    expect(res.status).toBe(200);
    expect(res.body.result).toBe('correct');
    expect(res.body.player).toBe(1);

    const stateRes = await request(app).get('/api/state');
    expect(stateRes.body.winner).toBe(1);
  });
});

describe('Integration: Guess history tracking', () => {
  it('should track all guesses in order', async () => {
    await request(app).get('/api/game').query({ numGuessers: 2, maxNumber: 100 });
    await request(app).get('/api/secret').query({ secret: 100 });

    await request(app).get('/api/guess').query({ player: 1, guess: 25 });
    await request(app).get('/api/guess').query({ player: 2, guess: 50 });
    await request(app).get('/api/guess').query({ player: 1, guess: 75 });

    const stateRes = await request(app).get('/api/state');
    expect(stateRes.body.guesses).toHaveLength(3);
    expect(stateRes.body.totalGuesses).toBe(3);
    expect(stateRes.body.guesses[0].player).toBe(1);
    expect(stateRes.body.guesses[1].player).toBe(2);
    expect(stateRes.body.guesses[2].player).toBe(1);
  });
});