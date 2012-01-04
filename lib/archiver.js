"use strict";
var async = require('async'),
    crypto = require('crypto'),
    request = require('request'),
    mongoose = require('mongoose'),
    FeedParser = require('feedparser'),
    Article = require('./models/article');

var Archiver = function (options) {
    options = options || {};

    this._feeds = options.feeds || [];
    this._databaseUrl = options.database;
    this._selectLink = options.selectLink || this._defaultSelectLink;

    this._db = mongoose.createConnection(options.database);
};

module.exports.create = function (options) {
    return new Archiver(options);
};

Archiver.prototype.get = function (id, callback) {
    this.
        _db.
        model('Article').
        findOne({id: id}, callback);
};

Archiver.prototype.query = function () {
    return this.
        _db.
        model('Article').
        find();
};

Archiver.prototype.compress = function (onCompressed) {
    var self = this;

    self.
        query().
        where('site.compressed', false).
        select('site').
        limit(300).
        run(function (err, documents) {
            if (err) {
                return onCompressed(err);
            }

            async.forEach(
                documents,
                function (doc, onDocumentsProcessed) {
                    async.waterfall([
                        function (cb) {
                            doc.getSite(cb);
                        },
                        function (site, cb) {
                            doc.setSite(site, true, cb);
                        },
                        function (cb) {
                            doc.save(cb);
                        }
                    ], onDocumentsProcessed);
                },
                onCompressed);
        });
};

Archiver.prototype.poll = function (callback) {
    var self = this,
        feeds = self._feeds,
        i = 0,
        len = feeds.length,
        queue,
        parser;

    queue = async.queue(function (element, cb) {
        self._checkArticle(element, cb);
    }, 3);

    parser = new FeedParser();
    parser.on('error', callback);
    parser.on('end', function (articles) {
        i += 1;

        if (i < len) {
            parser.parseUrl(feeds[i]);
        } else {
            queue.drain = callback;
        }

        articles.forEach(function (article) {
            queue.push(article);
        });
    });

    parser.parseUrl(feeds[i]);
};


Archiver.prototype._checkArticle = function (element, callback) {
    var self = this,
        Article = self._db.model('Article'),
        article = new Article(),
        id,
        link = this._selectLink(element);

    if (!link) {
        return callback('link does not exist: ' + JSON.stringify(element));
    }

    id = crypto.createHash('md5').update(link).digest('hex');

    return async.waterfall([
        function (cb) {
            Article.find({ 'id': id }, cb);
        },
        function (documents, cb) {
            if (documents.length === 0) {
                request(link, cb);
            } else {
                callback();
            }
        },
        function (response, body, cb) {
            if (body) {
                article.setSite(body, cb);
            } else {
                callback();
            }
        },
        function (cb) {
            var art = article;

            art.id = id;
            art.title = element.title;
            art.summary = element.summary;
            art.pubDate = element.pubDate;
            art.link = link;

            art.save(
                function (error) {
                    if (error) {
                        callback();
                    } else {
                        cb();
                    }
                });
        },
        callback]);
};

Archiver.prototype._defaultSelectLink = function (element) {
    return element.link;
};
