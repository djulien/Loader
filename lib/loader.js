/**
 * Loader
 * @license https://github.com/Droppe/Loader/blob/master/README.md MIT
 * @copyright Copyright 2013 Droppe
 * @author Robert Martone
 */

/**
 * Module dependencies.
 */

var fs = require('fs'),
  path = require('path'),
  async = require('async'),
  glob = require('multi-glob').glob,
  promise = require('promised-io/promise'),
  defaults;

defaults = {
  strict: undefined,
  limit: undefined,
  sort: undefined, //use "null" for default (alphanumeric) sort, or function for custom sort
  unique: false,
  noself: false
};

/**
 * Loads files based upon given pattern and then executes a callback passing
 * in each exports as a param
 * @param {String|Array} patterns a glob pattern or Array of patterns
 * @param {Object} options see https://github.com/isaacs/node-glob
 * @param {Function} callback a callback that receives each exports
 * @return {Promise} a promise
 */
function load(pattern, options, callback) {
  var deferred = new promise.Deferred();

  options = options || {};
  callback = callback || function () {};

  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  Object.keys(defaults).forEach(function (key) {
    if (!options[key]) {
      options[key] = defaults[key];
    }
  });

  function process(file) {
    var pathe = path.resolve(path.normalize(file));
//console.log("glob-loader: file ", file);
//console.log("caller: ", module.parent.parent.filename);
    if (callback) {
      callback(require(pathe), file);
    } else {
      require(pathe);
    }
  }

  glob(pattern, {
    strict: options.strict
  }, function (error, files) {
    if (error) {
      return error;
    }

    if (options.noself) {
      files.every(function (file, inx) {
        if (file !== module.parent.parent.filename) return true; //continue
        files.splice(inx, 1); //remove from list of matches
        return false; //stop searching
      });
    }

    if (options.unique && (files.length > 1)) {
      if (!callback) callback = function() {};
      callback(new Error("'" + pattern + "' matched " + files.length + " files"));
    }

    if (options.sort) files.sort(options.sort);

    if (options.limit) {
      async.eachLimit(files, options.limit, function(file, done) {
        process(file);
        done();
      }, function() {
        deferred.resolve();
      });
    } else {
      files.forEach(function (file) {
        process(file);
      });
      deferred.resolve();
    }
  });

  return deferred;
}

module.exports.load = load;
