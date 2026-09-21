/* ==========================================================================
   Arabic Kids English Learning App - Storage Manager
   Handles localStorage persistence for completed units, scores, and
   first-attempt correct ratios. Uses a single unified key 'kids_english_progress'.
   ========================================================================== */

var storageManager = (function () {

  /* --- Constants --- */
  var STORAGE_KEY = 'kids_english_progress';
  var STORAGE_VERSION = 1;

  /* --- Internal helpers --- */

  /**
   * Returns the default (empty) progress structure.
   */
  function createDefaultProgress() {
    return {
      version: STORAGE_VERSION,
      units: {},
      totalScore: 0,
      totalWordsLearned: 0,
      lastUpdated: null
    };
  }

  /**
   * Safely reads and parses the stored progress object.
   * Returns a fresh default structure if nothing is stored or if corruption is detected.
   */
  function loadRawProgress() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw === null) {
        return createDefaultProgress();
      }
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || !parsed.units) {
        return createDefaultProgress();
      }
      if (parsed.version !== STORAGE_VERSION) {
        return createDefaultProgress();
      }
      return parsed;
    } catch (e) {
      return createDefaultProgress();
    }
  }

  /**
   * Writes the given progress object to localStorage.
   */
  function saveRawProgress(progress) {
    try {
      progress.lastUpdated = new Date().toISOString();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch (e) {
      /* localStorage may be full or unavailable */
    }
  }

  /* --- Public API --- */

  return {

    /**
     * Retrieves the full progress object.
     * @returns {Object} The progress object containing units, score, and metadata.
     */
    getProgress: function () {
      return loadRawProgress();
    },

    /**
     * Saves the entire progress object.
     * @param {Object} progress - The progress object to persist.
     */
    saveProgress: function (progress) {
      saveRawProgress(progress);
    },

    /**
     * Checks whether a specific unit has been completed (all 6 words learned).
     * @param {string} unitId - The unique identifier of the unit.
     * @returns {boolean} True if the unit is completed.
     */
    isUnitCompleted: function (unitId) {
      var progress = loadRawProgress();
      return !!(progress.units[unitId] && progress.units[unitId].completed === true);
    },

    /**
     * Returns the stored progress data for a specific unit.
     * If the unit has never been stored, returns a default unit record.
     * @param {string} unitId - The unique identifier of the unit.
     * @returns {Object} Unit progress record.
     */
    getUnitProgress: function (unitId) {
      var progress = loadRawProgress();
      if (progress.units[unitId]) {
        return progress.units[unitId];
      }
      return {
        completed: false,
        correctFirstAttempt: 0,
        totalWords: 0,
        wordsLearned: []
      };
    },

    /**
     * Records the result of a single word attempt within a unit.
     * Updates first-attempt correct count and the list of learned words.
     * Automatically marks the unit as completed when all 6 words are learned.
     * @param {string} unitId - The unit identifier.
     * @param {string} wordEn - The English word that was attempted.
     * @param {boolean} correctOnFirstAttempt - Whether the child got it right on the first try.
     * @param {number} totalWordsInUnit - Total number of words in the unit (default 6).
     */
    recordWordAttempt: function (unitId, wordEn, correctOnFirstAttempt, totalWordsInUnit) {
      if (typeof totalWordsInUnit === 'undefined') {
        totalWordsInUnit = 6;
      }
      var progress = loadRawProgress();

      if (!progress.units[unitId]) {
        progress.units[unitId] = {
          completed: false,
          correctFirstAttempt: 0,
          totalWords: totalWordsInUnit,
          wordsLearned: []
        };
      }

      var unitData = progress.units[unitId];

      /* Avoid double-counting the same word */
      if (unitData.wordsLearned.indexOf(wordEn) === -1) {
        unitData.wordsLearned.push(wordEn);
        if (correctOnFirstAttempt) {
          unitData.correctFirstAttempt += 1;
        }
        /* Award 10 points per word learned for the first time */
        progress.totalScore += correctOnFirstAttempt ? 10 : 5;
        progress.totalWordsLearned += 1;
      }

      /* Auto-complete when all words have been learned at least once */
      if (unitData.wordsLearned.length >= totalWordsInUnit) {
        unitData.completed = true;
      }

      saveRawProgress(progress);
    },

    /**
     * Resets progress for a single unit (used if a parent wants to retry).
     * @param {string} unitId - The unit identifier.
     */
    resetUnit: function (unitId) {
      var progress = loadRawProgress();
      if (progress.units[unitId]) {
        var unitData = progress.units[unitId];
        var wordsCount = unitData.wordsLearned.length;
        var firstAttemptCorrect = unitData.correctFirstAttempt;

        /* Deduct score proportionally */
        progress.totalScore -= (firstAttemptCorrect * 10) + ((wordsCount - firstAttemptCorrect) * 5);
        if (progress.totalScore < 0) {
          progress.totalScore = 0;
        }
        progress.totalWordsLearned -= wordsCount;

        delete progress.units[unitId];
      }
      saveRawProgress(progress);
    },

    /**
     * Returns the total accumulated score across all units.
     * @returns {number}
     */
    getTotalScore: function () {
      var progress = loadRawProgress();
      return progress.totalScore || 0;
    },

    /**
     * Returns the total number of distinct words learned across all units.
     * @returns {number}
     */
    getTotalWordsLearned: function () {
      var progress = loadRawProgress();
      return progress.totalWordsLearned || 0;
    },

    /**
     * Returns an array of unit IDs that have been completed.
     * @returns {Array<string>}
     */
    getCompletedUnitIds: function () {
      var progress = loadRawProgress();
      var completed = [];
      var unitIds = Object.keys(progress.units);
      for (var i = 0; i < unitIds.length; i++) {
        if (progress.units[unitIds[i]].completed === true) {
          completed.push(unitIds[i]);
        }
      }
      return completed;
    },

    /**
     * Returns the ratio (0-1) of words answered correctly on the first attempt
     * within a given unit. Returns 0 if the unit has no data yet.
     * @param {string} unitId - The unit identifier.
     * @returns {number}
     */
    getFirstAttemptRatio: function (unitId) {
      var unitData = this.getUnitProgress(unitId);
      if (unitData.totalWords > 0) {
        return unitData.correctFirstAttempt / unitData.totalWords;
      }
      return 0;
    },

    /**
     * Completely wipes all stored progress and resets to a fresh state.
     */
    resetAllProgress: function () {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (e) {
        /* ignore */
      }
    },

    /**
     * Exposes the storage key string for debugging or external reference.
     * @returns {string}
     */
    getStorageKey: function () {
      return STORAGE_KEY;
    }
  };

})();
