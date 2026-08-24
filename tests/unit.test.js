import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app, resetGameSession } from '../index.js';

// Unit tests for Guess the Number Game API
// Validates: Requirements 1.4, 2.3, 2.4, 3.3, 3.4, 3.5, 3.6, 5.5, 7.1

beforeEach(() => {
  resetGameSession();
});

// ─── GET /api/game ──────────────────────────────────────────────────────────

describe('GET /api/game', () => {
  it('creates a game with valid params → 201', async () => {
    const res = await request(app).get('/api/game?numGuessers=3&maxNumber=100');
    expect(res.status).toBe(201);
    expect(res.body.message).toBe('Game created');
    expect(res.body.numGuessers).toBe(3);
    expect(res.body.maxNumber).toBe(100);
  });

  it('rejects numGuessers: 0 → 400', async () => {
    const res = await request(app).get('/api/game?numGuessers=0&maxNumber=100');
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('rejects maxNumber: -1 → 400', async () => {
    const res = await request(app).get('/api/game?numGuessers=3&maxNumber=-1');
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('rejects non-integer numGuessers: 1.5 → 400', async () => {
    const res = await request(app).get('/api/game?numGuessers=1.5&maxNumber=100');
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('rejects missing params → 400', async () => {
    const res = await request(app).get('/api/game');
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });
});

// ─── GET /api/secret ────────────────────────────────────────────────────────

describe('GET /api/secret', () => {
  it('accepts secret at lower boundary (1) → 200', async () => {
    await request(app).get('/api/game?numGuessers=2&maxNumber=50');
    const res = await request(app).get('/api/secret?secret=1');
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/Secret number set/);
  });

  it('accepts secret at upper boundary (maxNumber) → 200', async () => {
    await request(app).get('/api/game?numGuessers=2&maxNumber=50');
    const res = await request(app).get('/api/secret?secret=50');
    expect(res.status).toBe(200);
  });

  it('rejects secret below range (0) → 400', async () => {
    await request(app).get('/api/game?numGuessers=2&maxNumber=50');
    const res = await request(app).get('/api/secret?secret=0');
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('rejects secret above range (maxNumber + 1) → 400', async () => {
    await request(app).get('/api/game?numGuessers=2&maxNumber=50');
    const res = await request(app).get('/api/secret?secret=51');
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('rejects when no active game → 400', async () => {
    const res = await request(app).get('/api/secret?secret=10');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/No active game/);
  });

  it('rejects when secret already set → 400', async () => {
    await request(app).get('/api/game?numGuessers=2&maxNumber=50');
    await request(app).get('/api/secret?secret=25');
    const res = await request(app).get('/api/secret?secret=30');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Secret already set/);
  });
});

// ─── GET /api/guess ─────────────────────────────────────────────────────────

describe('GET /api/guess', () => {
  it('rejects when no active game → 400', async () => {
    const res = await request(app).get('/api/guess?player=1&guess=5');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/No active game/);
  });

  it('rejects when secret not set → 400', async () => {
    await request(app).get('/api/game?numGuessers=2&maxNumber=50');
    const res = await request(app).get('/api/guess?player=1&guess=5');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Secret not set/);
  });

  it('rejects wrong player turn → 400', async () => {
    await request(app).get('/api/game?numGuessers=3&maxNumber=50');
    await request(app).get('/api/secret?secret=25');
    const res = await request(app).get('/api/guess?player=2&guess=10');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/player 1/);
  });

  it('rejects guess below range (0) → 400', async () => {
    await request(app).get('/api/game?numGuessers=1&maxNumber=50');
    await request(app).get('/api/secret?secret=25');
    const res = await request(app).get('/api/guess?player=1&guess=0');
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('rejects guess above range (maxNumber + 1) → 400', async () => {
    await request(app).get('/api/game?numGuessers=1&maxNumber=50');
    await request(app).get('/api/secret?secret=25');
    const res = await request(app).get('/api/guess?player=1&guess=51');
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('returns too_high for guess above secret → 200', async () => {
    await request(app).get('/api/game?numGuessers=1&maxNumber=100');
    await request(app).get('/api/secret?secret=30');
    const res = await request(app).get('/api/guess?player=1&guess=50');
    expect(res.status).toBe(200);
    expect(res.body.result).toBe('too_high');
  });

  it('returns too_low for guess below secret → 200', async () => {
    await request(app).get('/api/game?numGuessers=1&maxNumber=100');
    await request(app).get('/api/secret?secret=70');
    const res = await request(app).get('/api/guess?player=1&guess=50');
    expect(res.status).toBe(200);
    expect(res.body.result).toBe('too_low');
  });

  it('rejects guess when game already complete → 400', async () => {
    await request(app).get('/api/game?numGuessers=1&maxNumber=100');
    await request(app).get('/api/secret?secret=42');
    await request(app).get('/api/guess?player=1&guess=42');
    const res = await request(app).get('/api/guess?player=1&guess=10');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/already complete/);
  });
});

// ─── Full game flow ─────────────────────────────────────────────────────────

describe('Full game completion flow', () => {
  it('create → set secret → guess correctly → verify winner', async () => {
    const createRes = await request(app).get('/api/game?numGuessers=2&maxNumber=100');
    expect(createRes.status).toBe(201);

    const secretRes = await request(app).get('/api/secret?secret=42');
    expect(secretRes.status).toBe(200);

    const g1 = await request(app).get('/api/guess?player=1&guess=20');
    expect(g1.status).toBe(200);
    expect(g1.body.result).toBe('too_low');
    expect(g1.body.nextPlayer).toBe(2);

    const g2 = await request(app).get('/api/guess?player=2&guess=42');
    expect(g2.status).toBe(200);
    expect(g2.body.result).toBe('correct');
    expect(g2.body.player).toBe(2);

    const stateRes = await request(app).get('/api/state');
    expect(stateRes.status).toBe(200);
    expect(stateRes.body.winner).toBe(2);
    expect(stateRes.body.totalGuesses).toBe(2);
    expect(stateRes.body.guesses).toHaveLength(2);
  });
});

// ─── GET /api/reset ─────────────────────────────────────────────────────────

describe('GET /api/reset', () => {
  it('clears game state so GET /api/state returns 400', async () => {
    await request(app).get('/api/game?numGuessers=2&maxNumber=50');
    const resetRes = await request(app).get('/api/reset');
    expect(resetRes.status).toBe(200);
    expect(resetRes.body.message).toMatch(/Game reset/);

    const stateRes = await request(app).get('/api/state');
    expect(stateRes.status).toBe(400);
    expect(stateRes.body.error).toMatch(/No active game/);
  });
});

// ─── GET /api/state ─────────────────────────────────────────────────────────

describe('GET /api/state', () => {
  it('returns 400 when no active game', async () => {
    const res = await request(app).get('/api/state');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/No active game/);
  });

  it('returns 200 with correct fields for active game', async () => {
    await request(app).get('/api/game?numGuessers=3&maxNumber=200');
    const res = await request(app).get('/api/state');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      active: true,
      numGuessers: 3,
      maxNumber: 200,
      secretSet: false,
      currentPlayer: 1,
      guesses: [],
      winner: null,
      totalGuesses: 0,
    });
  });
});

// ─── Static file serving ────────────────────────────────────────────────────

describe('Static file serving', () => {
  it('GET / serves index.html with HTML content', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/html/);
  });

  it('GET /index.html serves HTML content', async () => {
    const res = await request(app).get('/index.html');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/html/);
  });

  it('GET /style.css serves CSS content', async () => {
    const res = await request(app).get('/style.css');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/css/);
  });

  it('GET /app.js serves JavaScript content', async () => {
    const res = await request(app).get('/app.js');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/javascript/);
  });
});