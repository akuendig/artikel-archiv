var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId;

var Article = mongoose.model('Article', new Schema({
    id: { type: String, index: { unique: true } },
    title: String,
    summary: String,
    pubDate: Date,
    link: String,
    site: String
}));

exports.Article = Article;
