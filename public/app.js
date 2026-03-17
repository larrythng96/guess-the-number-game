(function () {
  // Elements
  var steps = {
    welcome: document.getElementById('step-welcome'),
    configure: document.getElementById('step-configure'),
    secret: document.getElementById('step-secret'),
    playing: document.getElementById('step-playing'),
    complete: document.getElementById('step-complete')
  };

  var pollTimer = null;
  var rootUrl = window.location.origin;

  // --- Step navigation ---

  function showStep(name) {
    Object.keys(steps).forEach(function (key) {
      steps[key].classList.toggle('hidden', key !== name);
    });
    // Stop polling when leaving playing/secret steps
    if (name !== 'playing' && name !== 'secret') {
      clearTimeout(pollTimer);
    }
  }

  // --- Step 0: Welcome ---

  document.getElementById('btn-new-game').addEventListener('click', async function () {
    // Reset any existing game first
    try { await fetch('/api/reset'); } catch (e) { /* ignore */ }
    showStep('configure');
  });

  // --- Step 1: Configure ---

  document.getElementById('btn-back-welcome').addEventListener('click', function () {
    showStep('welcome');
  });

  document.getElementById('game-form').addEventListener('submit', async function (e) {
    e.preventDefault();
    var errorEl = document.getElementById('config-error');
    errorEl.textContent = '';

    var numGuessers = parseInt(document.getElementById('numGuessers').value, 10);
    var maxNumber = parseInt(document.getElementById('maxNumber').value, 10);

    try {
      var res = await fetch('/api/game?numGuessers=' + numGuessers + '&maxNumber=' + maxNumber);
      if (!res.ok) {
        var data = await res.json();
        errorEl.textContent = data.error || 'Failed to create game';
        return;
      }

      // Populate secret step
      document.getElementById('secret-url').textContent =
        rootUrl + '/api/secret?secret=42';
      document.getElementById('secret-max').textContent = maxNumber;

      // Populate guess step
      document.getElementById('guess-url').textContent =
        rootUrl + '/api/guess?player=PLAYER&guess=NUMBER';
      document.getElementById('guess-max').textContent = maxNumber;

      showStep('secret');
      startPolling();
    } catch (err) {
      errorEl.textContent = 'Could not reach the server.';
    }
  });

  // --- Step 4: Play Again ---

  document.getElementById('btn-play-again').addEventListener('click', async function () {
    try { await fetch('/api/reset'); } catch (e) { /* ignore */ }
    showStep('configure');
  });

  // --- Polling & UI updates ---

  function formatResult(result) {
    if (result === 'too_high') return 'Too High ↑';
    if (result === 'too_low') return 'Too Low ↓';
    if (result === 'correct') return 'Correct ✓';
    return result;
  }

  function resultClass(result) {
    if (result === 'too_high') return 'too-high';
    if (result === 'too_low') return 'too-low';
    if (result === 'correct') return 'correct';
    return '';
  }

  function renderGuesses(guesses, container) {
    if (guesses.length === 0) {
      container.innerHTML = '<p class="text-muted">No guesses yet.</p>';
      return;
    }
    var html = '';
    for (var i = 0; i < guesses.length; i++) {
      var g = guesses[i];
      var cls = resultClass(g.result);
      html += '<div class="guess-entry ' + cls + '">' +
        '<div class="guess-entry-left">' +
        '<span class="guess-player">Player ' + g.player + '</span>' +
        '<span class="guess-value">' + g.guess + '</span>' +
        '</div>' +
        '<span class="guess-result ' + cls + '">' + formatResult(g.result) + '</span>' +
        '</div>';
    }
    container.innerHTML = html;
  }

  function updatePlayingUI(state) {
    document.getElementById('current-player-display').textContent = 'Player ' + state.currentPlayer;

    var guessList = document.getElementById('guess-list');
    var noGuesses = document.getElementById('no-guesses');

    if (state.guesses.length > 0 && noGuesses) {
      noGuesses.remove();
    }
    renderGuesses(state.guesses, guessList);
  }

  function showComplete(state) {
    document.getElementById('winner-text').textContent = 'Player ' + state.winner + ' wins!';
    document.getElementById('winner-detail').textContent =
      'Guessed correctly in ' + state.totalGuesses + (state.totalGuesses === 1 ? ' attempt' : ' attempts');

    renderGuesses(state.guesses, document.getElementById('final-guess-list'));
    showStep('complete');
  }

  async function pollState() {
    try {
      var res = await fetch('/api/state');
      if (!res.ok) {
        showStep('welcome');
        return;
      }
      var state = await res.json();

      if (state.winner !== null) {
        showComplete(state);
        return;
      }

      if (!state.secretSet) {
        // Still on secret step — keep polling
        pollTimer = setTimeout(pollState, 1500);
        return;
      }

      // Secret is set — move to playing step if not already there
      if (!steps.playing.classList.contains('hidden') || steps.secret.classList.contains('hidden')) {
        // Already on playing step or transitioning
      } else {
        showStep('playing');
      }

      // Make sure we're showing the playing step
      if (!steps.playing.classList.contains('hidden') || !steps.secret.classList.contains('hidden')) {
        if (state.secretSet && steps.secret && !steps.secret.classList.contains('hidden')) {
          showStep('playing');
        }
        updatePlayingUI(state);
      }

      pollTimer = setTimeout(pollState, 1500);
    } catch (e) {
      pollTimer = setTimeout(pollState, 2000);
    }
  }

  function startPolling() {
    clearTimeout(pollTimer);
    pollState();
  }

  // --- On page load: check if there's already an active game ---

  (async function init() {
    try {
      var res = await fetch('/api/state');
      if (res.ok) {
        var state = await res.json();

        // Populate URLs
        document.getElementById('secret-url').textContent =
          rootUrl + '/api/secret?secret=42';
        document.getElementById('secret-max').textContent = state.maxNumber;
        document.getElementById('guess-url').textContent =
          rootUrl + '/api/guess?player=PLAYER&guess=NUMBER';
        document.getElementById('guess-max').textContent = state.maxNumber;

        if (state.winner !== null) {
          showComplete(state);
        } else if (state.secretSet) {
          showStep('playing');
          updatePlayingUI(state);
          startPolling();
        } else {
          showStep('secret');
          startPolling();
        }
        return;
      }
    } catch (e) { /* no game */ }

    showStep('welcome');
  })();
})();
