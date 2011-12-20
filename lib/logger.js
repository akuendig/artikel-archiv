var mongoose = require('mongoose'),
    model = require('./model');

module.exports.createLogger = function (options) {
    return new Logger(options);
}

var Logger = function (options) {
    options = options || {};
    this.db = mongoose.createConnection('mongodb://localhost/' + (options.database || 'log'));
}

Logger.prototype.critical = function (error, callback) {
    var entry = new this.db.model('LogEntry');

    entry.date = Date.now();
    entry.message = error.toString();
    entry.importance = 1;

    return entry.save(callback);
}

Logger.prototype.error = function (error, callback) {
    var entry = new this.db.model('LogEntry');

    entry.date = Date.now();
    entry.message = error.toString();
    entry.importance = 2;

    return entry.save(callback);
}

Logger.prototype.info = function (info, callback) {
    var entry = new this.db.model('LogEntry');

    entry.date = Date.now();
    entry.message = JSON.stringify(info);
    entry.importance = 3;

    return entry.save(callback);
}

Logger.prototype.getImportance = function (importance, callback) {
    return 
        this.
        db.
        model('LogEntry').
        find({}, callback);
        /*find( {'importance': importance} , callback);
        desc(['date']).
        limit(20).
        run(callback);*/
};
