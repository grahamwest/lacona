var Category = require('./category');
var util = require('./util');

function startsWith(string1, string2) {
  return string1.lastIndexOf(string2, 0) === 0;
}


var InputOption = function(options, text, match, suggestion, completion, result, stack) {
  this.options = options;
  this.text = typeof text !== 'undefined' ? text : '';
  this.match = typeof match !== 'undefined' ? match : [];
  this.suggestion = typeof suggestion !== 'undefined' ? suggestion : { words: [] };
  this.completion = typeof completion !== 'undefined' ? completion : [];
  this.result = typeof result !== 'undefined' ? result : {};
  this.stack = typeof stack !== 'undefined' ? stack : [];
};

InputOption.prototype.stackPush = function (element) {
  var newStack = this.stack.concat(element);
  return new InputOption(this.options, this.text, this.match, this.suggestion, this.completion, this.result, newStack);
};

InputOption.prototype.stackPop = function () {
  var newStack = this.stack.slice(0, -1);
  return new InputOption(this.options, this.text, this.match, this.suggestion, this.completion, this.result, newStack);
};

InputOption.prototype.handleValue = function(id, value) {
  var newResult = util.clone(this.result);
  if (typeof value === 'undefined') {
    delete newResult[id];
  } else {
    newResult[id] = value;
  }
  return new InputOption(this.options, this.text, this.match, this.suggestion, this.completion, newResult, this.stack);
};

InputOption.prototype.clearTemps = function() {
  var newResult = util.clone(this.result);
  var id;

  for (id in newResult) {
    if (startsWith(id, '@temp')) {
      delete newResult[id];
    }
  }
  return new InputOption(this.options, this.text, this.match, this.suggestion, this.completion, newResult, this.stack);
};

InputOption.prototype.replaceResult = function(newResult) {
  return new InputOption(this.options, this.text, this.match, this.suggestion, this.completion, newResult, this.stack);
};

InputOption.prototype.doesStringContainThisText = function(string) {
  var fuzzyRegex;
  var fuzzyRegexString;
  var fuzzyMatches;

  if (this.options && this.options.fuzzy) {
    fuzzyRegexString = '^.*?' + this.text.split('').join('.*?');
    fuzzyRegex = new RegExp(fuzzyRegexString, 'i');

    fuzzyMatches = string.match(fuzzyRegex);
    if (typeof fuzzyMatches[0] !== undefined) {
      return fuzzyMatches[0].length;
    } else {
      return null;
    }
  } else {
    if (startsWith(string.toLowerCase(), this.text.toLowerCase())) {
      return this.text.length;
    } else {
      return null;
    }
  }
};

InputOption.prototype.doesThisTextContainString = function(string) {
  if (startsWith(this.text.toLowerCase(), string.toLowerCase())) {
    return string.length;
  } else {
    return null;
  }
};

InputOption.prototype.handleString = function(string, category) {
  var newText = this.text;
  var newMatch = this.match.slice(0);
  var newSuggestion = util.clone(this.suggestion);
  var newCompletion = this.completion.slice(0);
  var newResult = util.clone(this.result);
  var newWord = {
    string: string,
    category: category
  };
  var stringContainsThisText;
  var thisTextContainsString;

  //If the text is complete
  if (this.text.length === 0) {
    //If there is no suggestion
    if (this.suggestion && this.suggestion.words && this.suggestion.words.length === 0) {
      //This text is the new suggestion!
      newSuggestion = {
        charactersComplete: 0,
        words: [newWord]
      };

    //If there is a suggestion but this is just punctuation
  } else if (this.completion.length === 0 && category === Category.punctuation) {
      //Just tack it onto the suggestion
      newSuggestion.words.push(newWord);

    //There is a suggestion and this is not punctuation
    } else {
      //This is part of the completion
      newCompletion.push(newWord);
    }

  //The text is not complete - this is a part of the text
  } else {
    thisTextContainsString = this.doesThisTextContainString(string);
    stringContainsThisText = this.doesStringContainThisText(string);

    //If the provided string is a match, and it is fully consumed
    if (thisTextContainsString !== null) {
      //tack it onto the match and remove it from the text
      newMatch.push(newWord);
      newText = this.text.substring(thisTextContainsString);

    //This the provided string is a match, and it is not fully consumed
    } else if (stringContainsThisText !== null) {
      //This is the beginning of the suggestion, and the end of the text
      newSuggestion = {
        charactersComplete: stringContainsThisText,
        words: [newWord]
      };
      newText = '';

    //This is not a match at all
    } else {
      return null;
    }
  }

  return new InputOption(this.options, newText, newMatch, newSuggestion, newCompletion, newResult, this.stack);
};

module.exports = InputOption;
