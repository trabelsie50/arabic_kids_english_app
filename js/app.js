/* ==========================================================================
   Arabic Kids English Learning App - Main Application Engine
   Manages screen transitions, answer selection, random option generation,
   progress tracking, and UI language toggling.
   ========================================================================== */

(function () {
  'use strict';

  /* --- Application State --- */
  var currentScreen = 'home';       // 'home' | 'unit' | 'celebration'
  var currentUnitId = null;
  var currentWordIndex = 0;
  var currentLang = 'ar';           // 'ar' | 'en'
  var unitScore = 0;                // first-attempt correct count in current unit
  var unitTotalAttempts = 0;
  var isProcessing = false;         // prevents double-clicks during feedback

  /* --- DOM References --- */
  var appContainer = null;
  var homeScreen = null;
  var unitScreen = null;
  var celebrationModal = null;
  var progressBar = null;
  var progressText = null;
  var cartoonCharacter = null;

  /* --- Constants --- */
  var CELEBRATION_DELAY = 1800;
  var WORD_DISPLAY_DELAY = 1200;
  var WRONG_RETRY_DELAY = 1500;
  var CHARACTER_ANIM_DURATION = 1000;

  /* --- Helpers --- */

  /**
   * Retrieves the current unit data object from UNITS_DATA by ID.
   * @param {string} unitId
   * @returns {Object|null}
   */
  function getUnitById(unitId) {
    for (var i = 0; i < UNITS_DATA.length; i++) {
      if (UNITS_DATA[i].id === unitId) return UNITS_DATA[i];
    }
    return null;
  }

  /**
   * Returns the current unit data object.
   * @returns {Object|null}
   */
  function getCurrentUnit() {
    if (!currentUnitId) return null;
    return getUnitById(currentUnitId);
  }

  /**
   * Returns the current word object from the current unit.
   * @returns {Object|null}
   */
  function getCurrentWord() {
    var unit = getCurrentUnit();
    if (!unit) return null;
    return unit.words[currentWordIndex] || null;
  }

  /**
   * Generates 3 options: 1 correct + 2 random distractors from the same unit.
   * Shuffles the result before returning.
   * @returns {Array<{en: string, isCorrect: boolean}>}
   */
  function generateOptions() {
    var unit = getCurrentUnit();
    if (!unit) return [];

    var correctEn = unit.words[currentWordIndex].en;
    var others = [];
    for (var i = 0; i < unit.words.length; i++) {
      if (unit.words[i].en !== correctEn) {
        others.push(unit.words[i].en);
      }
    }

    // Fisher-Yates shuffle for distractors
    for (var j = others.length - 1; j > 0; j--) {
      var k = Math.floor(Math.random() * (j + 1));
      var tmp = others[j];
      others[j] = others[k];
      others[k] = tmp;
    }

    var distractors = others.slice(0, 2);
    var options = distractors.concat([correctEn]);

    // Shuffle final options
    for (var m = options.length - 1; m > 0; m--) {
      var n = Math.floor(Math.random() * (m + 1));
      var tmp2 = options[m];
      options[m] = options[n];
      options[n] = tmp2;
    }

    var result = [];
    for (var p = 0; p < options.length; p++) {
      result.push({ en: options[p], isCorrect: options[p] === correctEn });
    }
    return result;
  }

  /**
   * Looks up a word's data by its English name within the current unit.
   * @param {string} enWord
   * @returns {Object|null}
   */
  function findWordData(enWord) {
    var unit = getCurrentUnit();
    if (!unit) return null;
    for (var i = 0; i < unit.words.length; i++) {
      if (unit.words[i].en === enWord) return unit.words[i];
    }
    return null;
  }

  /**
   * Retrieves UI text for a given key in the current language.
   * Falls back to the key itself if translation is missing.
   * @param {string} key
   * @returns {string}
   */
  function ui(key) {
    if (!UI_TEXTS || !UI_TEXTS[currentLang]) return key;
    return UI_TEXTS[currentLang][key] || key;
  }

  /**
   * Updates the progress bar and counter for the current unit.
   */
  function updateProgress() {
    var unit = getCurrentUnit();
    if (!unit) return;

    var progress = storageManager.getUnitProgress(currentUnitId);
    var learned = progress ? progress.learnedCount : 0;
    var total = unit.words.length;
    var pct = Math.round((learned / total) * 100);

    if (progressBar) {
      progressBar.style.width = pct + '%';
    }
    if (progressText) {
      progressText.textContent = learned + ' / ' + total;
    }
  }

  /**
   * Finds the next incomplete unit after the given unitId.
   * Returns the unit ID or null if all units are complete.
   * @param {string} fromUnitId
   * @returns {string|null}
   */
  function getNextIncompleteUnit(fromUnitId) {
    var startIndex = -1;
    for (var i = 0; i < UNITS_DATA.length; i++) {
      if (UNITS_DATA[i].id === fromUnitId) {
        startIndex = i;
        break;
      }
    }
    if (startIndex < 0) return UNITS_DATA[0] ? UNITS_DATA[0].id : null;

    for (var j = 1; j <= UNITS_DATA.length; j++) {
      var idx = (startIndex + j) % UNITS_DATA.length;
      var prog = storageManager.getUnitProgress(UNITS_DATA[idx].id);
      if (!prog || !prog.completed) {
        return UNITS_DATA[idx].id;
      }
    }
    return null; // all complete
  }

  /* --- Screen Rendering --- */

  /**
   * Renders the home screen with unit cards and language toggle.
   */
  function renderHomeScreen() {
    if (!homeScreen) return;
    homeScreen.innerHTML = '';
    homeScreen.style.display = 'block';

    var header = document.createElement('div');
    header.className = 'home-header';

    var title = document.createElement('h1');
    title.textContent = ui('appTitle');
    header.appendChild(title);

    var langBtn = document.createElement('button');
    langBtn.className = 'btn lang-toggle-btn';
    langBtn.textContent = currentLang === 'ar' ? 'EN' : 'عربي';
    langBtn.setAttribute('aria-label', 'Toggle language');
    langBtn.addEventListener('click', toggleLanguage);
    header.appendChild(langBtn);

    homeScreen.appendChild(header);

    var grid = document.createElement('div');
    grid.className = 'unit-grid';

    for (var i = 0; i < UNITS_DATA.length; i++) {
      (function (unit) {
        var card = document.createElement('div');
        card.className = 'unit-card';

        var progress = storageManager.getUnitProgress(unit.id);
        var isComplete = progress ? progress.completed : false;

        var iconDiv = document.createElement('div');
        iconDiv.className = 'unit-card-icon';
        iconDiv.innerHTML = unit.icon;
        card.appendChild(iconDiv);

        var titleDiv = document.createElement('div');
        titleDiv.className = 'unit-card-title';
        titleDiv.textContent = currentLang === 'ar' ? unit.titleAr : unit.title;
        card.appendChild(titleDiv);

        var statusDiv = document.createElement('div');
        statusDiv.className = 'unit-card-status';
        statusDiv.textContent = isComplete ? ui('completed') : ui('start');
        card.appendChild(statusDiv);

        card.addEventListener('click', function () {
          startUnit(unit.id);
        });

        grid.appendChild(card);
      })(UNITS_DATA[i]);
    }

    homeScreen.appendChild(grid);
  }

  /**
   * Renders the learning screen for the current word.
   */
  function renderLearningScreen() {
    if (!unitScreen) return;
    unitScreen.innerHTML = '';
    unitScreen.style.display = 'block';

    var unit = getCurrentUnit();
    if (!unit) return;

    // Unit title header
    var unitHeader = document.createElement('div');
    unitHeader.className = 'unit-header';
    var unitTitle = document.createElement('h2');
    unitTitle.textContent = currentLang === 'ar' ? unit.titleAr : unit.title;
    unitHeader.appendChild(unitTitle);
    unitScreen.appendChild(unitHeader);

    // Progress bar
    var progressContainer = document.createElement('div');
    progressContainer.className = 'progress-container';

    progressBar = document.createElement('div');
    progressBar.className = 'progress-bar';
    progressBar.style.width = '0%';
    progressContainer.appendChild(progressBar);

    progressText = document.createElement('span');
    progressText.className = 'progress-text';
    progressText.textContent = '0 / ' + unit.words.length;
    progressContainer.appendChild(progressText);

    unitScreen.appendChild(progressContainer);

    // Word display area
    var wordArea = document.createElement('div');
    wordArea.className = 'word-area';
    wordArea.id = 'word-area';
    unitScreen.appendChild(wordArea);

    // Options area
    var optionsArea = document.createElement('div');
    optionsArea.className = 'options-area';
    optionsArea.id = 'options-area';
    unitScreen.appendChild(optionsArea);

    // Listen again button
    var listenBtn = document.createElement('button');
    listenBtn.className = 'btn listen-btn';
    listenBtn.id = 'listen-btn';
    listenBtn.textContent = ui('listenAgain');
    listenBtn.addEventListener('click', function () {
      speechManager.repeatWord();
    });
    unitScreen.appendChild(listenBtn);

    // Back button
    var backBtn = document.createElement('button');
    backBtn.className = 'btn back-btn';
    backBtn.textContent = ui('backToUnits');
    backBtn.addEventListener('click', function () {
      goHome();
    });
    unitScreen.appendChild(backBtn);

    // Show current word
    showWord();
  }

  /**
   * Displays the current word: SVG image, English label, and speaks it.
   */
  function showWord() {
    var word = getCurrentWord();
    if (!word) return;

    var wordArea = document.getElementById('word-area');
    if (!wordArea) return;

    wordArea.innerHTML = '';

    // SVG container
    var svgContainer = document.createElement('div');
    svgContainer.className = 'word-svg';
    svgContainer.innerHTML = word.svg;
    wordArea.appendChild(svgContainer);

    // English label
    var label = document.createElement('p');
    label.className = 'word-label';
    label.textContent = word.en;
    wordArea.appendChild(label);

    // Speak the word
    speechManager.speakWord(word.en);

    // Show options after delay
    setTimeout(function () {
      showOptions();
    }, WORD_DISPLAY_DELAY);
  }

  /**
   * Generates and displays 3 answer option buttons with SVG images.
   */
  function showOptions() {
    var optionsArea = document.getElementById('options-area');
    if (!optionsArea) return;

    optionsArea.innerHTML = '';
    var options = generateOptions();

    for (var i = 0; i < options.length; i++) {
      (function (opt) {
        var btn = document.createElement('button');
        btn.className = 'option-btn';

        var wordData = findWordData(opt.en);
        if (wordData) {
          var svgWrap = document.createElement('span');
          svgWrap.className = 'option-svg';
          svgWrap.innerHTML = wordData.svg;
          btn.appendChild(svgWrap);
        }

        var label = document.createElement('span');
        label.className = 'option-label';
        label.textContent = opt.en;
        btn.appendChild(label);

        btn.setAttribute('data-answer', opt.en);
        btn.setAttribute('data-correct', opt.isCorrect ? 'true' : 'false');

        btn.addEventListener('click', function () {
btn.addEventListener('click', function () {
      handleAnswerCheck(opt);
    });

    btn.addEventListener('mouseenter', function () {
      speechManager.speakWord(opt.en);
    });

    optionsArea.appendChild(btn);
  })(options[i]);
}

/**
 * Checks the selected answer and provides feedback.
 */
function handleAnswerCheck(selected) {
  var buttons = document.querySelectorAll('.option-btn');
  for (var i = 0; i < buttons.length; i++) {
    buttons[i].disabled = true;
  }

  if (selected.isCorrect) {
    speechManager.speakCorrect();
    showFeedback(true);
    score++;
    updateScore();
  } else {
    speechManager.speakWrong();
    showFeedback(false);
    for (var j = 0; j < buttons.length; j++) {
      if (buttons[j].getAttribute('data-correct') === 'true') {
        buttons[j].classList.add('correct-answer');
      }
      buttons[j].classList.add('wrong-answer');
    }
  }

  setTimeout(function () {
    currentWordIndex++;
    if (currentWordIndex < words.length) {
      displayWord(words[currentWordIndex]);
    } else {
      showResults();
    }
  }, FEEDBACK_DELAY);
}

/**
 * Displays feedback indicator.
 */
function showFeedback(isCorrect) {
  var feedback = document.getElementById('feedback');
  if (!feedback) return;
  feedback.textContent = isCorrect ? 'Correct!' : 'Try again!';
  feedback.className = 'feedback ' + (isCorrect ? 'correct' : 'wrong');
}

/**
 * Updates the score display.
 */
function updateScore() {
  var scoreEl = document.getElementById('score');
  if (scoreEl) {
    scoreEl.textContent = 'Score: ' + score;
  }
}

/**
 * Shows final results screen.
 */
function showResults() {
  var gameArea = document.getElementById('game-area');
  var resultsArea = document.getElementById('results-area');
  if (gameArea) gameArea.style.display = 'none';
  if (!resultsArea) return;

  resultsArea.innerHTML = '';
  var title = document.createElement('h2');
  title.textContent = 'Game Over!';
  resultsArea.appendChild(title);

  var scoreText = document.createElement('p');
  scoreText.className = 'final-score';
  scoreText.textContent = 'Your score: ' + score + ' / ' + words.length;
  resultsArea.appendChild(scoreText);

  var restartBtn = document.createElement('button');
  restartBtn.className = 'restart-btn';
  restartBtn.textContent = 'Play Again';
  restartBtn.addEventListener('click', function () {
    resetGame();
  });
  resultsArea.appendChild(restartBtn);

  resultsArea.style.display = 'block';
}

/**
 * Resets the game state and restarts.
 */
function resetGame() {
  currentWordIndex = 0;
  score = 0;
  updateScore();
  var resultsArea = document.getElementById('results-area');
  if (resultsArea) resultsArea.style.display = 'none';
  var optionsArea = document.getElementById('options-area');
  if (optionsArea) optionsArea.innerHTML = '';
  var feedback = document.getElementById('feedback');
  if (feedback) feedback.className = 'feedback';
  displayWord(words[currentWordIndex]);
}

/**
 * Initializes the game when DOM is ready.
 */
function init() {
  var startBtn = document.getElementById('start-btn');
  if (startBtn) {
    startBtn.addEventListener('click', function () {
      var startScreen = document.getElementById('start-screen');
      if (startScreen) startScreen.style.display = 'none';
      var gameArea = document.getElementById('game-area');
      if (gameArea) gameArea.style.display = 'block';
      score = 0;
      updateScore();
      displayWord(words[currentWordIndex]);
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
