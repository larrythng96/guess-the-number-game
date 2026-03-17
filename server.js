const express = require('express');
const path = require('path');

const app = express();

app.use(express.static(path.join(__dirname, 'public')));

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
