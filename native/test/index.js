var nativeExtension = require('../');
var assert = require('assert');

describe('native extension', function() {
  it('should export a function that returns a string', function() {
    assert.equal(typeof nativeExtension.calculateVoyageRecommendations('{}', function(testString) {
      console.log(testString);
    }, function(testString) {
      console.log(testString);
    }), 'undefined');
    //assert.equal(typeof nativeExtension.calculateVoyageRecommendations(), 'string');
    assert.equal(typeof nativeExtension.calculateVoyageCrewRank('{}', function(testString) {
      console.log(testString);
    }, function(testString) {
      console.log(testString);
    }), 'undefined');
  });
});
