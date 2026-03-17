const request = require('supertest');
const fc = require('fast-check');
const { app, resetGameSession } = require('../server');

// Feature: guess-the-number-game, Property 1: Game creation round trip
// Validates: Requirements 1.4, 1.5
describe('Property 1: Game creation round trip', () => {
  beforeEach(() => {
    resetGameSession();
  });

  it('creating a game and reading state should return matching config and correct defaults', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 1, max: 10000 }),
        async (numGuessers, maxNumber) => {
          resetGameSession();

          const createRes = await request(app)
            .get('/api/game')
            .query({ numGuessers, maxNumber });
          expect(createRes.status).toBe(201);

          const stateRes = await request(app).get('/api/state');
          expect(stateRes.status).toBe(200);

          const state = stateRes.body;
          expect(state.numGuessers).toBe(numGuessers);
          expect(state.maxNumber).toBe(maxNumber);
          expect(state.secretSet).toBe(false);
          expect(state.currentPlayer).toBe(1);
          expect(state.guesses).toEqual([]);
          expect(state.winner).toBeNull();
          expect(state.totalGuesses).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: guess-the-number-game, Property 2: Secret setting round trip
// Validates: Requirements 2.2, 2.5
describe('Property 2: Secret setting round trip', () => {
  beforeEach(() => {
    resetGameSession();
  });

  it('setting a valid secret and reading state should show secretSet as true', async () => {
    const gameArb = fc
      .record({
        numGuessers: fc.integer({ min: 1, max: 100 }),
        maxNumber: fc.integer({ min: 1, max: 10000 }),
      })
      .chain(({ numGuessers, maxNumber }) =>
        fc.record({
          numGuessers: fc.constant(numGuessers),
          maxNumber: fc.constant(maxNumber),
          secret: fc.integer({ min: 1, max: maxNumber }),
        })
      );

    await fc.assert(
      fc.asyncProperty(gameArb, async ({ numGuessers, maxNumber, secret }) => {
        resetGameSession();

        const createRes = await request(app)
          .get('/api/game')
          .query({ numGuessers, maxNumber });
        expect(createRes.status).toBe(201);

        const secretRes = await request(app)
          .get('/api/secret')
          .query({ secret });
        expect(secretRes.status).toBe(200);

        const stateRes = await request(app).get('/api/state');
        expect(stateRes.status).toBe(200);
        expect(stateRes.body.secretSet).toBe(true);
      }),
      { numRuns: 100 }
    );
  });
});

// Feature: guess-the-number-game, Property 3: Secret range validation
// Validates: Requirements 2.3, 2.4
describe('Property 3: Secret range validation', () => {
  beforeEach(() => {
    resetGameSession();
  });

  it('setting an out-of-range secret should return 400 and leave secretSet false', async () => {
    const gameArb = fc
      .record({
        numGuessers: fc.integer({ min: 1, max: 100 }),
        maxNumber: fc.integer({ min: 1, max: 10000 }),
      })
      .chain(({ numGuessers, maxNumber }) =>
        fc.record({
          numGuessers: fc.constant(numGuessers),
          maxNumber: fc.constant(maxNumber),
          secret: fc.oneof(
            fc.integer({ min: -1000, max: 0 }),
            fc.integer({ min: maxNumber + 1, max: maxNumber + 1000 })
          ),
        })
      );

    await fc.assert(
      fc.asyncProperty(gameArb, async ({ numGuessers, maxNumber, secret }) => {
        resetGameSession();

        const createRes = await request(app)
          .get('/api/game')
          .query({ numGuessers, maxNumber });
        expect(createRes.status).toBe(201);

        const secretRes = await request(app)
          .get('/api/secret')
          .query({ secret });
        expect(secretRes.status).toBe(400);

        const stateRes = await request(app).get('/api/state');
        expect(stateRes.status).toBe(200);
        expect(stateRes.body.secretSet).toBe(false);
      }),
      { numRuns: 100 }
    );
  });
});

// Feature: guess-the-number-game, Property 4: Guess feedback correctness
// Validates: Requirements 3.8
describe('Property 4: Guess feedback correctness', () => {
  beforeEach(() => {
    resetGameSession();
  });

  it('guess feedback should match comparison of guess to secret', async () => {
    const gameArb = fc
      .integer({ min: 1, max: 10000 })
      .chain((maxNumber) =>
        fc.record({
          maxNumber: fc.constant(maxNumber),
          secret: fc.integer({ min: 1, max: maxNumber }),
          guess: fc.integer({ min: 1, max: maxNumber }),
        })
      );

    await fc.assert(
      fc.asyncProperty(gameArb, async ({ maxNumber, secret, guess }) => {
        resetGameSession();

        const createRes = await request(app)
          .get('/api/game')
          .query({ numGuessers: 1, maxNumber });
        expect(createRes.status).toBe(201);

        const secretRes = await request(app)
          .get('/api/secret')
          .query({ secret });
        expect(secretRes.status).toBe(200);

        const guessRes = await request(app)
          .get('/api/guess')
          .query({ player: 1, guess });
        expect(guessRes.status).toBe(200);

        if (guess > secret) {
          expect(guessRes.body.result).toBe('too_high');
        } else if (guess < secret) {
          expect(guessRes.body.result).toBe('too_low');
        } else {
          expect(guessRes.body.result).toBe('correct');
        }
      }),
      { numRuns: 100 }
    );
  });
});

// Feature: guess-the-number-game, Property 5: Turn enforcement
// Validates: Requirements 3.3, 3.4
describe('Property 5: Turn enforcement', () => {
  beforeEach(() => {
    resetGameSession();
  });

  it('guessing with the wrong player should return 400 and leave state unchanged', async () => {
    const gameArb = fc
      .record({
        numGuessers: fc.integer({ min: 2, max: 10 }),
        maxNumber: fc.integer({ min: 1, max: 10000 }),
      })
      .chain(({ numGuessers, maxNumber }) =>
        fc.record({
          numGuessers: fc.constant(numGuessers),
          maxNumber: fc.constant(maxNumber),
          secret: fc.integer({ min: 1, max: maxNumber }),
          wrongPlayer: fc.integer({ min: 2, max: numGuessers }),
          guess: fc.integer({ min: 1, max: maxNumber }),
        })
      );

    await fc.assert(
      fc.asyncProperty(gameArb, async ({ numGuessers, maxNumber, secret, wrongPlayer, guess }) => {
        resetGameSession();

        const createRes = await request(app)
          .get('/api/game')
          .query({ numGuessers, maxNumber });
        expect(createRes.status).toBe(201);

        const secretRes = await request(app)
          .get('/api/secret')
          .query({ secret });
        expect(secretRes.status).toBe(200);

        const guessRes = await request(app)
          .get('/api/guess')
          .query({ player: wrongPlayer, guess });
        expect(guessRes.status).toBe(400);

        const stateRes = await request(app).get('/api/state');
        expect(stateRes.status).toBe(200);
        expect(stateRes.body.currentPlayer).toBe(1);
        expect(stateRes.body.guesses).toEqual([]);
      }),
      { numRuns: 100 }
    );
  });
});

// Feature: guess-the-number-game, Property 6: Guess range validation
// Validates: Requirements 3.5, 3.6
describe('Property 6: Guess range validation', () => {
  beforeEach(() => {
    resetGameSession();
  });

  it('submitting an out-of-range guess should return 400 and leave state unchanged', async () => {
    const gameArb = fc
      .integer({ min: 1, max: 10000 })
      .chain((maxNumber) =>
        fc.record({
          maxNumber: fc.constant(maxNumber),
          secret: fc.integer({ min: 1, max: maxNumber }),
          outOfRangeGuess: fc.oneof(
            fc.integer({ min: -1000, max: 0 }),
            fc.integer({ min: maxNumber + 1, max: maxNumber + 1000 })
          ),
        })
      );

    await fc.assert(
      fc.asyncProperty(gameArb, async ({ maxNumber, secret, outOfRangeGuess }) => {
        resetGameSession();

        const createRes = await request(app)
          .get('/api/game')
          .query({ numGuessers: 1, maxNumber });
        expect(createRes.status).toBe(201);

        const secretRes = await request(app)
          .get('/api/secret')
          .query({ secret });
        expect(secretRes.status).toBe(200);

        const guessRes = await request(app)
          .get('/api/guess')
          .query({ player: 1, guess: outOfRangeGuess });
        expect(guessRes.status).toBe(400);

        const stateRes = await request(app).get('/api/state');
        expect(stateRes.status).toBe(200);
        expect(stateRes.body.guesses).toEqual([]);
        expect(stateRes.body.currentPlayer).toBe(1);
      }),
      { numRuns: 100 }
    );
  });
});

// Feature: guess-the-number-game, Property 7: Turn rotation
// Validates: Requirements 3.7
describe('Property 7: Turn rotation', () => {
  beforeEach(() => {
    resetGameSession();
  });

  it('after each valid non-winning guess by player K, nextPlayer should be (K % N) + 1', async () => {
    const gameArb = fc
      .record({
        numGuessers: fc.integer({ min: 2, max: 10 }),
        maxNumber: fc.integer({ min: 2, max: 10000 }),
      })
      .chain(({ numGuessers, maxNumber }) =>
        fc.record({
          numGuessers: fc.constant(numGuessers),
          maxNumber: fc.constant(maxNumber),
          guesses: fc.array(
            fc.integer({ min: 1, max: maxNumber - 1 }),
            { minLength: 1, maxLength: numGuessers * 2 }
          ),
        })
      );

    await fc.assert(
      fc.asyncProperty(gameArb, async ({ numGuessers, maxNumber, guesses }) => {
        resetGameSession();

        const createRes = await request(app)
          .get('/api/game')
          .query({ numGuessers, maxNumber });
        expect(createRes.status).toBe(201);

        const secretRes = await request(app)
          .get('/api/secret')
          .query({ secret: maxNumber });
        expect(secretRes.status).toBe(200);

        let currentPlayer = 1;
        for (const guessValue of guesses) {
          const guessRes = await request(app)
            .get('/api/guess')
            .query({ player: currentPlayer, guess: guessValue });
          expect(guessRes.status).toBe(200);

          const expectedNextPlayer = (currentPlayer % numGuessers) + 1;
          expect(guessRes.body.nextPlayer).toBe(expectedNextPlayer);

          currentPlayer = expectedNextPlayer;
        }
      }),
      { numRuns: 100 }
    );
  });
});

// Feature: guess-the-number-game, Property 8: Correct guess completes game
// Validates: Requirements 7.1, 7.2
describe('Property 8: Correct guess completes game', () => {
  beforeEach(() => {
    resetGameSession();
  });

  it('submitting a guess equal to the secret should mark the game complete with that player as winner', async () => {
    const gameArb = fc
      .integer({ min: 1, max: 10000 })
      .chain((maxNumber) =>
        fc.record({
          maxNumber: fc.constant(maxNumber),
          secret: fc.integer({ min: 1, max: maxNumber }),
        })
      );

    await fc.assert(
      fc.asyncProperty(gameArb, async ({ maxNumber, secret }) => {
        resetGameSession();

        const createRes = await request(app)
          .get('/api/game')
          .query({ numGuessers: 1, maxNumber });
        expect(createRes.status).toBe(201);

        const secretRes = await request(app)
          .get('/api/secret')
          .query({ secret });
        expect(secretRes.status).toBe(200);

        const guessRes = await request(app)
          .get('/api/guess')
          .query({ player: 1, guess: secret });
        expect(guessRes.status).toBe(200);

        expect(guessRes.body.result).toBe('correct');

        const stateRes = await request(app).get('/api/state');
        expect(stateRes.status).toBe(200);
        expect(stateRes.body.active).toBe(true);
        expect(stateRes.body.winner).toBe(1);
      }),
      { numRuns: 100 }
    );
  });
});

// Feature: guess-the-number-game, Property 9: Guess history completeness
// Validates: Requirements 5.4, 7.3
describe('Property 9: Guess history completeness', () => {
  beforeEach(() => {
    resetGameSession();
  });

  it('guess history should contain all submitted guesses in order with correct totalGuesses', async () => {
    const gameArb = fc
      .record({
        numGuessers: fc.integer({ min: 1, max: 5 }),
        maxNumber: fc.integer({ min: 2, max: 10000 }),
      })
      .chain(({ numGuessers, maxNumber }) =>
        fc.record({
          numGuessers: fc.constant(numGuessers),
          maxNumber: fc.constant(maxNumber),
          guessValues: fc.array(
            fc.integer({ min: 1, max: maxNumber - 1 }),
            { minLength: 1, maxLength: 10 }
          ),
        })
      );

    await fc.assert(
      fc.asyncProperty(gameArb, async ({ numGuessers, maxNumber, guessValues }) => {
        resetGameSession();

        const createRes = await request(app)
          .get('/api/game')
          .query({ numGuessers, maxNumber });
        expect(createRes.status).toBe(201);

        const secretRes = await request(app)
          .get('/api/secret')
          .query({ secret: maxNumber });
        expect(secretRes.status).toBe(200);

        let currentPlayer = 1;
        const expectedGuesses = [];
        for (const guessValue of guessValues) {
          const guessRes = await request(app)
            .get('/api/guess')
            .query({ player: currentPlayer, guess: guessValue });
          expect(guessRes.status).toBe(200);

          expectedGuesses.push({
            player: currentPlayer,
            guess: guessValue,
            result: guessValue < maxNumber ? 'too_low' : 'too_high',
          });

          currentPlayer = (currentPlayer % numGuessers) + 1;
        }

        const stateRes = await request(app).get('/api/state');
        expect(stateRes.status).toBe(200);

        const { guesses, totalGuesses } = stateRes.body;

        expect(guesses.length).toBe(guessValues.length);
        expect(totalGuesses).toBe(guesses.length);

        for (let i = 0; i < expectedGuesses.length; i++) {
          expect(guesses[i].player).toBe(expectedGuesses[i].player);
          expect(guesses[i].guess).toBe(expectedGuesses[i].guess);
          expect(guesses[i].result).toBe(expectedGuesses[i].result);
        }
      }),
      { numRuns: 100 }
    );
  });
});
