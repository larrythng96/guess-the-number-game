# Requirements Document

## Introduction

A multiplayer guess-the-number game where one player sets a secret number and other players take turns trying to guess it. The game is built using Express.js for the backend API and HTML/CSS/JS for the frontend interface. The system uses in-memory storage and provides clear API instructions with GitHub Codespaces compatibility.

## Glossary

- **Game_System**: The complete guess-the-number application including API and web interface
- **Game_Session**: A single instance of the game with configured players and number range
- **Secret_Setter**: The first player who configures and sets the secret number
- **Guesser**: Any player attempting to guess the secret number
- **Turn**: A single opportunity for a Guesser to submit a guess
- **Number_Range**: The valid range of numbers from 1 to a configured maximum value
- **API_Endpoint**: HTTP endpoint that accepts requests and returns responses
- **Root_URL**: The base URL where the application is hosted

## Requirements

### Requirement 1: Game Configuration

**User Story:** As a Secret_Setter, I want to configure the game parameters, so that I can set up a game with the desired number of players and difficulty level.

#### Acceptance Criteria

1. THE Game_System SHALL provide a home screen interface for game configuration
2. THE Game_System SHALL accept the number of Guessers as input
3. THE Game_System SHALL accept the maximum value for the Number_Range as input
4. WHEN configuration is submitted, THE Game_System SHALL create a new Game_Session
5. WHEN a Game_Session is created, THE Game_System SHALL store the configuration in memory

### Requirement 2: Secret Number Setup

**User Story:** As a Secret_Setter, I want to set the secret number through the API, so that other players can start guessing.

#### Acceptance Criteria

1. THE Game_System SHALL display API instructions for setting the secret number
2. THE API_Endpoint SHALL accept a secret number from the Secret_Setter
3. WHEN a secret number is received, THE Game_System SHALL validate it is within the Number_Range
4. IF the secret number is outside the Number_Range, THEN THE API_Endpoint SHALL return an error response with status code 400
5. WHEN a valid secret number is set, THE Game_System SHALL store it in the Game_Session
6. WHEN a valid secret number is set, THE Game_System SHALL enable Guessers to start submitting guesses

### Requirement 3: Turn-Based Guessing

**User Story:** As a Guesser, I want to submit guesses in turn order, so that the game is fair and organized.

#### Acceptance Criteria

1. THE Game_System SHALL display API instructions for submitting guesses
2. THE API_Endpoint SHALL accept guess submissions with player identification
3. WHEN a guess is received, THE Game_System SHALL validate it is the correct player's Turn
4. IF a guess is submitted out of turn, THEN THE API_Endpoint SHALL return an error response with status code 400
5. WHEN a guess is received, THE Game_System SHALL validate it is within the Number_Range
6. IF a guess is outside the Number_Range, THEN THE API_Endpoint SHALL return an error response with status code 400
7. WHEN a valid guess is submitted, THE Game_System SHALL advance to the next player's Turn
8. WHEN a valid guess is submitted, THE Game_System SHALL return feedback indicating if the guess is too high, too low, or correct

### Requirement 4: API Instructions Display

**User Story:** As a player, I want to see clear API instructions with the correct URL, so that I can interact with the game from any environment including GitHub Codespaces.

#### Acceptance Criteria

1. THE Game_System SHALL display the Root_URL in all API instructions
2. THE Game_System SHALL display the complete endpoint path for setting the secret number
3. THE Game_System SHALL display the complete endpoint path for submitting guesses
4. THE Game_System SHALL display example curl commands or request formats
5. THE Game_System SHALL display the current game state including whose turn it is

### Requirement 5: In-Memory Game State

**User Story:** As a developer, I want the game state stored in memory, so that the implementation remains simple without database dependencies.

#### Acceptance Criteria

1. THE Game_System SHALL store all Game_Session data in memory
2. THE Game_System SHALL store the secret number in memory
3. THE Game_System SHALL store the current Turn information in memory
4. THE Game_System SHALL store the guess history in memory
5. WHEN the server restarts, THE Game_System SHALL reset all game state

### Requirement 6: Simple Web Interface

**User Story:** As a player, I want a simple web interface, so that I can easily set up and play the game.

#### Acceptance Criteria

1. THE Game_System SHALL serve HTML pages for the user interface
2. THE Game_System SHALL serve CSS for styling the interface
3. THE Game_System SHALL serve JavaScript for client-side interactivity
4. THE Game_System SHALL provide a home screen for game configuration
5. THE Game_System SHALL provide a game screen showing API instructions and game state
6. THE Game_System SHALL update the display when game state changes

### Requirement 7: Game Completion

**User Story:** As a player, I want to know when the game is won, so that I can see the results and start a new game.

#### Acceptance Criteria

1. WHEN a Guesser submits the correct number, THE Game_System SHALL mark the game as complete
2. WHEN the game is complete, THE Game_System SHALL display the winning player
3. WHEN the game is complete, THE Game_System SHALL display the total number of guesses
4. WHEN the game is complete, THE Game_System SHALL provide an option to start a new game
