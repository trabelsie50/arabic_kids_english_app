/* ==========================================================================
   Arabic Kids English Learning App - Speech Manager
   Handles Web Speech API: female voice selection, word pronunciation,
   encouragement phrases, and replay functionality.
   ========================================================================== */

const speechManager = {
  voices: [],
  selectedVoice: null,
  fallbackVoice: null,
  currentWord: '',
  isSpeaking: false,

  FEMALE_INDICATORS: [
    'Female', 'Samantha', 'Karen', 'Moira', 'Tessa', 'Joanna', 'Zira',
    'Crystal', 'Susan', 'Margaret', 'Victoria', 'Kendra', 'Salli',
    'Allison', 'Ava', 'Lisa', 'Mizuki', 'Hikari', 'Nana', 'Mia',
    'Sarah', 'Emily', 'Emma', 'Olivia', 'Sophia', 'Charlotte',
    'Amira', 'Noor', 'Hala', 'Lina'
  ],

  ENGLISH_LANG_CODES: [
    'en-US', 'en-GB', 'en-AU', 'en-CA', 'en-NZ', 'en-IE', 'en-IN', 'en'
  ],

  CORRECT_PHRASES: [
    'Great job!',
    'Excellent!',
    'You did it!',
    'Well done!',
    'Awesome!',
    'Fantastic!',
    'Super!',
    'Amazing!',
    'Good work!',
    'Brilliant!',
    'Nice!',
    'Perfect!'
  ],

  WRONG_PHRASES: [
    'Try again, you can do it!',
    "Don't give up!",
    'Keep trying!',
    'Almost there!',
    "You'll get it next time!",
    'Never give up!',
    'You are so close!',
    'Try once more!'
  ],

  init: function () {
    var self = this;
    this.loadVoices();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = function () {
        self.loadVoices();
      };
    }
  },

  loadVoices: function () {
    if (!('speechSynthesis' in window)) {
      return;
    }
    this.voices = window.speechSynthesis.getVoices();
    this.selectFemaleVoice();
  },

  selectFemaleVoice: function () {
    var femaleVoice = null;
    var firstEnglish = null;
    var i;

    for (i = 0; i < this.voices.length; i++) {
      var voice = this.voices[i];
      var isEnglish = this.isEnglishVoice(voice);

      if (isEnglish && !firstEnglish) {
        firstEnglish = voice;
      }

      if (isEnglish && this.isFemaleVoice(voice)) {
        femaleVoice = voice;
        break;
      }
    }

    if (femaleVoice) {
      this.selectedVoice = femaleVoice;
    } else if (firstEnglish) {
      this.selectedVoice = firstEnglish;
    } else if (this.voices.length > 0) {
      this.selectedVoice = this.voices[0];
    } else {
      this.selectedVoice = null;
    }

    this.fallbackVoice = this.selectedVoice;
  },

  isEnglishVoice: function (voice) {
    var lang = voice.lang;
    if (!lang) return false;
    var langLower = lang.toLowerCase();
    for (var i = 0; i < this.ENGLISH_LANG_CODES.length; i++) {
      if (langLower === this.ENGLISH_LANG_CODES[i] || langLower.startsWith(this.ENGLISH_LANG_CODES[i] + '-')) {
        return true;
      }
    }
    if (voice.name && voice.name.toLowerCase().indexOf('english') !== -1) {
      return true;
    }
    return false;
  },

  isFemaleVoice: function (voice) {
    var name = voice.name || '';
    var lang = voice.lang || '';
    var combined = (name + ' ' + lang).toLowerCase();
    for (var i = 0; i < this.FEMALE_INDICATORS.length; i++) {
      if (combined.indexOf(this.FEMALE_INDICATORS[i].toLowerCase()) !== -1) {
        return true;
      }
    }
    return false;
  },

  speak: function (text, onEnd) {
    var self = this;
    if (!('speechSynthesis' in window)) {
      if (onEnd) onEnd();
      return;
    }

    window.speechSynthesis.cancel();

    var utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = this.selectedVoice ? this.selectedVoice.lang : 'en-US';
    utterance.rate = 0.85;
    utterance.pitch = 1.2;
    utterance.volume = 1;

    if (this.selectedVoice) {
      utterance.voice = this.selectedVoice;
    }

    this.isSpeaking = true;

    utterance.onend = function () {
      self.isSpeaking = false;
      if (onEnd) onEnd();
    };

    utterance.onerror = function () {
      self.isSpeaking = false;
      if (onEnd) onEnd();
    };

    window.speechSynthesis.speak(utterance);
  },

  speakWord: function (word) {
    this.currentWord = word;
    this.speak(word);
  },

  replay: function () {
    if (this.currentWord) {
      this.speakWord(this.currentWord);
    }
  },

  getRandomPhrase: function (type) {
    var phrases;
    if (type === 'correct') {
      phrases = this.CORRECT_PHRASES;
    } else if (type === 'wrong') {
      phrases = this.WRONG_PHRASES;
    } else {
      phrases = this.CORRECT_PHRASES;
    }

    var randomIndex = Math.floor(Math.random() * phrases.length);
    return phrases[randomIndex];
  },

  encourageCorrect: function () {
    var phrase = this.getRandomPhrase('correct');
    var self = this;
    this.speak(phrase, function () {});
  },

  encourageWrong: function (correctWord) {
    var phrase = this.getRandomPhrase('wrong');
    var self = this;
    this.speak(phrase, function () {
      if (correctWord) {
        self.currentWord = correctWord;
        self.speak(correctWord);
      }
    });
  },

  stop: function () {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      this.isSpeaking = false;
    }
  },

  isVoiceReady: function () {
    return this.selectedVoice !== null || this.voices.length > 0;
  }
};

speechManager.init();
