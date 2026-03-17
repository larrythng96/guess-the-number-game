# Implementation Plan: Guess the Number Game

## Overview

Build a multiplayer guess-the-number game with an Express.js backend API and vanilla HTML/CSS/JS frontend. Implementation proceeds from server setup and core API logic, through validation and game flow, to the frontend interface, with property-based and unit tests woven in alongside each component.

## Tasks

- [x] 1. Set up project structure and Express server
  - [x] 1.1 Initialize the project with `package.json` and install dependencies (`express`, `jest`, `supertest`, `fast-check`)
    - Create `package.json` with scripts for `start` and `test`
    - _Requirements: 5.1_

  - [x] 1.2 Create `server.js` with Express app, JSON middleware, static file serving from `public/`, and server listen
    - Define the in-memory `gameSession` variable (initially `null`)
    - Export the Express app for testing
    - _Requirements: 5.1, 6.1_

  - [x] 1.3 Create `.devcontainer/devcontainer.json` for GitHub Codespaces
    - Use Node.js base image
    - Run `npm install` automatically via `postCreateCommand`
    - Forward port 3000 so the app is accessible in Codespaces

- [x] 2. Implement game creation and state endpoints
  - [x] 2.1 Implement `POST /api/game` endpoint
    - Validate `numGuessers` and `maxNumber` are positive integers
    - Create a new `GameSession` object in memory with defaults (secret null, currentPlayer 1, empty guesses, winner null, complete false)
    - Return 201 with confirmation; return 400 on invalid input
    - _Requirements: 1.2, 1.3, 1.4, 1.5_

  - [x] 2.2 Implement `GET /api/state` endpoint
    - Return current game session state (active, numGuessers, maxNumber, secretSet, currentPlayer, guesses, winner, totalGuesses)
    - Return 400 if no active game
    - _Requirements: 4.5, 5.1, 5.2, 5.3, 5.4_

  - [x] 2.3 Implement `POST /api/reset` endpoint
    - Clear the in-memory game session back to null
    - Return 200 with confirmation
    - _Requirements: 5.5, 7.4_

  - [x] 2.4 Write property test: Game creation round trip (Property 1)
    - **Property 1: Game creation round trip**
    - Generate random valid configs (numGuessers ≥ 1, maxNumber ≥ 1), create game, verify state matches
    - **Validates: Requirements 1.4, 1.5**

- [x] 3. Implement secret number setting
  - [x] 3.1 Implement `POST /api/secret` endpoint
    - Validate an active game exists and secret is not already set
    - Validate secret is an integer within [1, maxNumber]
    - Store secret in game session; return 200 on success, 400 on error
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 3.2 Write property test: Secret setting round trip (Property 2)
    - **Property 2: Secret setting round trip**
    - Generate random valid secrets within range, set and verify secretSet is true
    - **Validates: Requirements 2.2, 2.5**

  - [x] 3.3 Write property test: Secret range validation (Property 3)
    - **Property 3: Secret range validation**
    - Generate random out-of-range secrets, verify 400 response and session unchanged
    - **Validates: Requirements 2.3, 2.4**

- [x] 4. Implement guess submission and turn logic
  - [x] 4.1 Implement `POST /api/guess` endpoint
    - Validate active game, secret set, game not complete
    - Validate player matches currentPlayer
    - Validate guess is an integer within [1, maxNumber]
    - Compare guess to secret: return `"too_high"`, `"too_low"`, or `"correct"`
    - On correct guess: mark game complete, set winner
    - On non-winning guess: advance turn to `(currentPlayer % numGuessers) + 1`
    - Append guess to history
    - Return 200 with result; return 400 on any validation failure
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 7.1, 7.2, 7.3_

  - [x] 4.2 Write property test: Guess feedback correctness (Property 4)
    - **Property 4: Guess feedback correctness**
    - Generate random secrets and guesses, verify feedback matches comparison
    - **Validates: Requirements 3.8**

  - [x] 4.3 Write property test: Turn enforcement (Property 5)
    - **Property 5: Turn enforcement**
    - Generate random wrong-player guesses, verify 400 response and state unchanged
    - **Validates: Requirements 3.3, 3.4**

  - [x] 4.4 Write property test: Guess range validation (Property 6)
    - **Property 6: Guess range validation**
    - Generate random out-of-range guesses, verify 400 response and state unchanged
    - **Validates: Requirements 3.5, 3.6**

  - [x] 4.5 Write property test: Turn rotation (Property 7)
    - **Property 7: Turn rotation**
    - Generate sequences of valid non-winning guesses, verify turn advances as `(K % N) + 1`
    - **Validates: Requirements 3.7**

  - [x] 4.6 Write property test: Correct guess completes game (Property 8)
    - **Property 8: Correct guess completes game**
    - Generate random games, submit the correct guess, verify game marked complete with winner
    - **Validates: Requirements 7.1, 7.2**

  - [x] 4.7 Write property test: Guess history completeness (Property 9)
    - **Property 9: Guess history completeness**
    - Generate random guess sequences, verify history length, order, and totalGuesses
    - **Validates: Requirements 5.4, 7.3**

- [x] 5. Checkpoint - Verify backend API
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Build frontend interface
  - [x] 6.1 Create `public/style.css` with shared styles
    - Style the home screen form and game screen layout
    - _Requirements: 6.2_

  - [x] 6.2 Create `public/index.html` home screen
    - Form with inputs for number of guessers and max number
    - Submit button that posts to `POST /api/game` and redirects to game screen
    - _Requirements: 1.1, 1.2, 1.3, 6.4_

  - [x] 6.3 Create `public/game.html` game screen
    - Display API instructions with full root URL for setting secret and submitting guesses
    - Show example curl commands
    - Display current game state: whose turn, guess history, winner
    - Provide "New Game" button that calls `POST /api/reset` and redirects to home
    - _Requirements: 2.1, 3.1, 4.1, 4.2, 4.3, 4.4, 4.5, 6.5, 7.2, 7.3, 7.4_

  - [x] 6.4 Create `public/app.js` client-side logic
    - Handle form submission on home screen
    - Poll `GET /api/state` on game screen to refresh display
    - Update UI dynamically when game state changes (new guesses, game complete)
    - Handle reset/new game flow
    - _Requirements: 6.3, 6.6_

- [x] 7. Write unit tests
  - [x] 7.1 Write unit tests for all API endpoints using supertest
    - Test game creation with valid and invalid parameters
    - Test secret setting at boundary values (1 and maxNumber)
    - Test guess when no game exists, when secret not set
    - Test full game completion flow: create → set secret → guess correctly → verify winner
    - Test reset clears all state
    - Test static file serving (index.html, game.html, style.css, app.js)
    - _Requirements: 1.4, 2.3, 2.4, 3.3, 3.4, 3.5, 3.6, 5.5, 7.1_

- [x] 8. Create README.md for instructors and students
  - Clear, succinct overview of the game and how it works
  - Setup instructions (local and GitHub Codespaces)
  - How to play: game flow from configuration to guessing via API
  - API reference with example curl commands
  - Keep it short and scannable

- [x] 9. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests use `fast-check` and unit tests use `jest` + `supertest`
- Checkpoints ensure incremental validation of backend before building frontend
