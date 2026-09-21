/* ==========================================================================
   Arabic Kids English Learning App - Main Application Engine
   Handles initialization, unit card display, screen navigation,
   word learning flow, and integration with data/storage/speech modules.
   ========================================================================== */

(function () {
  'use strict';

  /* --- Application State --- */
  var currentScreen = 'home';
  var currentUnitId = null;
  var currentWordIndex = 0;
  var currentLang = 'ar';
  var unitScore = 0;
  var isProcessing = false;

  /* --- DOM References --- */
  var unitsGrid = null;
  var homeScreen = null;
  var unitScreen = null;
  var appTitle = null;
  var langToggle = null;
  var langText = null;
  var progressFill = null;
  var progressText = null;
  var unitTitle = null;
  var wordDisplay = null;
  var optionsArea = null;
  var settingsScreen = null;

  /* --- Constants --- */
  var WORD_DISPLAY_DELAY = 1200;
  var FEEDBACK_DELAY = 1500;

  /* --- Helpers --- */

  function getUnitById(unitId) {
    for (var i = 0; i < UNITS_DATA.length; i++) {
      if (UNITS_DATA[i].id === unitId) return UNITS_DATA[i];
    }
    return null;
  }

  function getCurrentUnit() {
    if (!currentUnitId) return null;
    return getUnitById(currentUnitId);
  }

  function getCurrentWord() {
    var unit = getCurrentUnit();
    if (!unit) return null;
    return unit.words[currentWordIndex] || null;
  }

  function ui(key) {
    if (!UI_TEXTS || !UI_TEXTS[currentLang]) return key;
    return UI_TEXTS[currentLang][key] || key;
  }

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

    for (var j = others.length - 1; j > 0; j--) {
      var k = Math.floor(Math.random() * (j + 1));
      var tmp = others[j];
      others[j] = others[k];
      others[k] = tmp;
    }

    var distractors = others.slice(0, 2);
    var options = distractors.concat([correctEn]);

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

  function findWordData(enWord) {
    var unit = getCurrentUnit();
    if (!unit) return null;
    for (var i = 0; i < unit.words.length; i++) {
      if (unit.words[i].en === enWord) return unit.words[i];
    }
    return null;
  }

  /* --- Screen Management --- */

  function showScreen(screenName) {
    if (homeScreen) homeScreen.style.display = 'none';
    if (unitScreen) unitScreen.style.display = 'none';
    if (settingsScreen) settingsScreen.style.display = 'none';

    currentScreen = screenName;

    if (screenName === 'home' && homeScreen) {
      homeScreen.style.display = 'block';
      renderHomeScreen();
    } else if (screenName === 'unit' && unitScreen) {
      unitScreen.style.display = 'block';
    } else if (screenName === 'settings' && settingsScreen) {
      settingsScreen.style.display = 'block';
    }
  }

  /* --- Home Screen --- */

  function renderHomeScreen() {
    if (!unitsGrid) return;
    unitsGrid.innerHTML = '';

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
        titleDiv.textContent = unit.title;
        card.appendChild(titleDiv);

        var progressDiv = document.createElement('div');
        progressDiv.className = 'unit-card-progress';
        if (isComplete) {
          progressDiv.textContent = '✅ مكتمل';
        } else if (progress && progress.learnedWords) {
          progressDiv.textContent = '📖 ' + progress.learnedWords + '/' + unit.words.length;
        } else {
          progressDiv.textContent = '📖 0/' + unit.words.length;
        }
        card.appendChild(progressDiv);

        card.addEventListener('click', function () {
          currentUnitId = unit.id;
          showScreen('unit');
        });

        unitsGrid.appendChild(card);
      })(UNITS_DATA[i]);
    }
  }

  /* --- Unit Screen --- */

  function renderUnitScreen() {
    if (!unitScreen) return;
    var unit = getCurrentUnit();
    if (!unit) return;

    var unitHeader = document.getElementById('unit-header');
    if (unitHeader) {
      unitHeader.innerHTML = unit.icon + ' ' + unit.title;
    }

    var wordsContainer = document.getElementById('words-container');
    if (!wordsContainer) return;
    wordsContainer.innerHTML = '';

    for (var i = 0; i < unit.words.length; i++) {
      (function (word) {
        var wordCard = document.createElement('div');
        wordCard.className = 'word-card';

        var wordEn = document.createElement('div');
        wordEn.className = 'word-en';
        wordEn.textContent = word.en;
        wordCard.appendChild(wordEn);

        var wordAr = document.createElement('div');
        wordAr.className = 'word-ar';
        wordAr.textContent = word.ar;
        wordCard.appendChild(wordAr);

        var wordStatus = document.createElement('div');
        wordStatus.className = 'word-status';
        var progress = storageManager.getWordProgress(unit.id, word.en);
        if (progress && progress.mastered) {
          wordStatus.textContent = '✅';
          wordCard.classList.add('mastered');
        } else if (progress && progress.learned) {
          wordStatus.textContent = '📗';
        } else {
          wordStatus.textContent = '📕';
        }
        wordCard.appendChild(wordStatus);

        wordCard.addEventListener('click', function () {
          openWordDetail(unit.id, word.en);
        });

        wordsContainer.appendChild(wordCard);
      })(unit.words[i]);
    }
  }

  function openWordDetail(unitId, enWord) {
    var word = findWordData(enWord);
    if (!word) return;

    var modal = document.getElementById('word-modal');
    if (!modal) return;

    var modalEn = document.getElementById('modal-en');
    var modalAr = document.getElementById('modal-ar');
    var modalExample = document.getElementById('modal-example');
    var modalAudio = document.getElementById('modal-audio');

    if (modalEn) modalEn.textContent = word.en;
    if (modalAr) modalAr.textContent = word.ar;
    if (modalExample) modalExample.textContent = word.example || '';

    if (modalAudio) {
      modalAudio.onclick = function () {
        speakWord(word.en);
      };
    }

    var learnBtn = document.getElementById('modal-learn-btn');
    if (learnBtn) {
      learnBtn.onclick = function () {
        storageManager.markWordLearned(unitId, enWord);
        if (modal) modal.style.display = 'none';
        renderUnitScreen();
      };
    }

    var masteredBtn = document.getElementById('modal-master-btn');
    if (masteredBtn) {
      masteredBtn.onclick = function () {
        storageManager.markWordMastered(unitId, enWord);
        if (modal) modal.style.display = 'none';
        renderUnitScreen();
      };
    }

    modal.style.display = 'block';
  }

  /* --- Settings Screen --- */

  function renderSettingsScreen() {
    if (!settingsScreen) return;
    var themeSelect = document.getElementById('theme-select');
    if (themeSelect) {
      themeSelect.value = storageManager.getTheme() || 'light';
      themeSelect.onchange = function () {
        storageManager.setTheme(themeSelect.value);
        applyTheme(themeSelect.value);
      };
    }

    var resetBtn = document.getElementById('reset-progress-btn');
    if (resetBtn) {
      resetBtn.onclick = function () {
        if (confirm('هل تريد إعادة تعيين جميع التقدم؟')) {
          storageManager.resetAllProgress();
          renderHomeScreen();
        }
      };
    }
  }

  function applyTheme(theme) {
    if (theme === 'dark') {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }

  /* --- Speech --- */

  function speakWord(text) {
    if ('speechSynthesis' in window) {
      var utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.8;
      window.speechSynthesis.speak(utterance);
    }
  }

  /* --- Initialization --- */

  function init() {
    storageManager.init();
    applyTheme(storageManager.getTheme() || 'light');
    showScreen('home');
  }

  document.addEventListener('DOMContentLoaded', init);
})();
