# Guess the Number Game

A multiplayer turn-based guessing game. One player sets a secret number, and the others take turns guessing it through simple browser URLs, getting "too high", "too low", or "correct" feedback.

## Quick Start

### Local

```bash
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000).

### GitHub Codespaces

Open this repo in a Codespace — dependencies install automatically. Then:

```bash
npm start
```

The app is available on forwarded port 3000.

## How to Play

1. Open the web UI and configure a new game (number of guessers, max number).
2. The secret setter opens the secret URL in their browser to set the number.
3. Guessers take turns opening the guess URL in their browser.
4. Each guess returns feedback: `too_high`, `too_low`, or `correct`.
5. The game ends when someone guesses correctly. Hit "New Game" to play again.

## API Reference

All endpoints use GET requests with query parameters — just open the URL in your browser. Base URL: `http://localhost:3000`

### Create a game

```
http://localhost:3000/api/game?numGuessers=2&maxNumber=100
```

### Set the secret number

```
http://localhost:3000/api/secret?secret=42
```

### Submit a guess

```
http://localhost:3000/api/guess?player=1&guess=50
```

### Get current game state

```
http://localhost:3000/api/state
```

### Reset the game

```
http://localhost:3000/api/reset
```

## Running Tests

```bash
npm test
```

Tests use Jest, Supertest, and fast-check (property-based testing).
