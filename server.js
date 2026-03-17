const express = require('express');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');

const app = express();

app.use(express.static(path.join(__dirname, 'public')));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

let gameSession = null;

function resetGameSession() {
  gameSession = null;
}

function getGameSession() {
  return gameSession;
}

function setGameSession(session) {
  gameSession = session;
}

/**
 * @swagger
 * /api/game:
 *   get:
 *     summary: Create a new game
 *     parameters:
 *       - in: query
 *         name: numGuessers
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Number of players
 *       - in: query
 *         name: maxNumber
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Upper bound for the secret number
 *     responses:
 *       201:
 *         description: Game created
 *       400:
 *         description: Invalid parameters
 */
app.get('/api/game', (req, res) => {
  const rawGuessers = req.query.numGuessers;
  const rawMax = req.query.maxNumber;
  const numGuessers = Number(rawGuessers);
  const maxNumber = Number(rawMax);
  if (
    !Number.isInteger(numGuessers) || numGuessers < 1 ||
    !Number.isInteger(maxNumber) || maxNumber < 1
  ) {
    return res.status(400).json({ error: 'numGuessers and maxNumber must be positive integers' });
  }
  setGameSession({
    numGuessers,
    maxNumber,
    secret: null,
    currentPlayer: 1,
    guesses: [],
    winner: null,
    complete: false
  });
  return res.status(201).json({ message: 'Game created', numGuessers, maxNumber });
});

/**
 * @swagger
 * /api/state:
 *   get:
 *     summary: Get current game state
 *     responses:
 *       200:
 *         description: Current game state
 *       400:
 *         description: No active game
 */
app.get('/api/state', (req, res) => {
  const session = getGameSession();
  if (!session) {
    return res.status(400).json({ error: 'No active game' });
  }
  return res.status(200).json({
    active: true,
    numGuessers: session.numGuessers,
    maxNumber: session.maxNumber,
    secretSet: session.secret !== null,
    currentPlayer: session.currentPlayer,
    guesses: session.guesses,
    winner: session.winner,
    totalGuesses: session.guesses.length
  });
});

/**
 * @swagger
 * /api/secret:
 *   get:
 *     summary: Set the secret number
 *     parameters:
 *       - in: query
 *         name: secret
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: The secret number (must be between 1 and maxNumber)
 *     responses:
 *       200:
 *         description: Secret set successfully
 *       400:
 *         description: Invalid secret or no active game
 */
app.get('/api/secret', (req, res) => {
  const session = getGameSession();
  if (!session) {
    return res.status(400).json({ error: 'No active game' });
  }
  if (session.secret !== null) {
    return res.status(400).json({ error: 'Secret already set' });
  }
  const secret = Number(req.query.secret);
  if (!Number.isInteger(secret) || secret < 1 || secret > session.maxNumber) {
    return res.status(400).json({ error: `Secret must be between 1 and ${session.maxNumber}` });
  }
  session.secret = secret;
  return res.status(200).json({ message: 'Secret number set. Guessing can begin!' });
});

/**
 * @swagger
 * /api/guess:
 *   get:
 *     summary: Make a guess
 *     parameters:
 *       - in: query
 *         name: player
 *         required: true
 *         schema:
 *           type: integer
 *         description: Player number (must match current turn)
 *       - in: query
 *         name: guess
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: The guessed number
 *     responses:
 *       200:
 *         description: Guess result (too_high, too_low, or correct)
 *       400:
 *         description: Invalid guess, wrong turn, or no active game
 */
app.get('/api/guess', (req, res) => {
  const session = getGameSession();
  if (!session) {
    return res.status(400).json({ error: 'No active game' });
  }
  if (session.secret === null) {
    return res.status(400).json({ error: 'Secret not set yet' });
  }
  if (session.complete) {
    return res.status(400).json({ error: 'Game is already complete' });
  }
  const player = Number(req.query.player);
  const guess = Number(req.query.guess);
  if (player !== session.currentPlayer) {
    return res.status(400).json({ error: `It is player ${session.currentPlayer}'s turn` });
  }
  if (!Number.isInteger(guess) || guess < 1 || guess > session.maxNumber) {
    return res.status(400).json({ error: `Guess must be between 1 and ${session.maxNumber}` });
  }

  let result;
  if (guess > session.secret) {
    result = 'too_high';
  } else if (guess < session.secret) {
    result = 'too_low';
  } else {
    result = 'correct';
  }

  session.guesses.push({ player, guess, result });

  if (result === 'correct') {
    session.complete = true;
    session.winner = player;
    return res.status(200).json({ result, player, guess });
  }

  session.currentPlayer = (player % session.numGuessers) + 1;
  return res.status(200).json({ result, player, guess, nextPlayer: session.currentPlayer });
});

/**
 * @swagger
 * /api/reset:
 *   get:
 *     summary: Reset the current game
 *     responses:
 *       200:
 *         description: Game reset successfully
 */
app.get('/api/reset', (req, res) => {
  resetGameSession();
  return res.status(200).json({ message: 'Game reset' });
});

if (require.main === module) {
  app.listen(3000, () => {
    console.log('Server running on port 3000');
  });
}

module.exports = { app, getGameSession, setGameSession, resetGameSession };
