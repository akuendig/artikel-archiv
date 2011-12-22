var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var LogEntry = new Schema({
    date: Date,
    message: String,
    importance: Number
});

exports = module.exports = mongoose.model('LogEntry', LogEntry);
