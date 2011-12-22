"use strict";
var mongoose = require('mongoose'),
    LogEntry = require('./models/logentry');

var Logger = function (options) {
    options = options || {};
    this.db = mongoose.createConnection('mongodb://localhost/' + (options.database || 'log'));
};

module.exports.createLogger = function (options) {
    return new Logger(options);
};

Logger.prototype.critical = function (error, callback) {
    var LogEntry = this.db.model('LogEntry'),
        entry = new LogEntry();

    entry.date = Date.now();
    entry.message = error.toString();
    entry.importance = 1;

    return entry.save(callback);
};

Logger.prototype.error = function (error, callback) {
    var LogEntry = this.db.model('LogEntry'),
        entry = new LogEntry();

    entry.date = Date.now();
    entry.message = error.toString();
    entry.importance = 2;

    return entry.save(callback);
};

Logger.prototype.info = function (info, callback) {
    var LogEntry = this.db.model('LogEntry'),
        entry = new LogEntry();

    entry.date = Date.now();
    entry.message = info.toString();
    entry.importance = 3;

    return entry.save(callback);
};

Logger.prototype.getImportance = function (importance, callback) {
    this.
        db.
        model('LogEntry').
        find({'importance': importance}).
        desc('date').
        limit(20).
        run(callback);
};


Logger.prototype.getAll = function (callback) {
    this.
        db.
        model('LogEntry').
        find({}).
        desc('date').
        limit(20).
        run(callback);
};
