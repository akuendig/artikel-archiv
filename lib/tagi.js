"use strict";
var async = require('async'),
    crypto = require('crypto'),
    request = require('request'),
    mongoose = require('mongoose'),
    FeedParser = require('feedparser'),
    Article = require('./models/article');

var Tagi = function () {
    this.db = mongoose.createConnection('mongodb://localhost/tagi');
};

module.exports = new Tagi();

Tagi.prototype.get = function (id, callback) {
    this.
        db.
        model('Article').
        findOne({id: id}, callback);
};

Tagi.prototype.poll = function (callback) {
    var self = this,
        feeds = [
            'http://www.tagesanzeiger.ch/rss.html',
            'http://www.tagesanzeiger.ch/rss_ticker.html',
            'http://www.tagesanzeiger.ch/zuerich/rss.html',
            'http://www.tagesanzeiger.ch/schweiz/rss.html',
            'http://www.tagesanzeiger.ch/ausland/rss.html',
            'http://www.tagesanzeiger.ch/wirtschaft/rss.html',
            'http://www.tagesanzeiger.ch/sport/rss.html',
            'http://www.tagesanzeiger.ch/kultur/rss.html',
            'http://www.tagesanzeiger.ch/panorama/rss.html',
            'http://www.tagesanzeiger.ch/leben/rss.html',
            'http://www.tagesanzeiger.ch/auto/rss.html',
            'http://www.tagesanzeiger.ch/digital/rss.html',
            'http://www.tagesanzeiger.ch/wissen/rss.html',
            'http://www.tagesanzeiger.ch/dienste/RSS/story/rss.html'
        ],
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


Tagi.prototype._checkArticle = function (element, callback) {
    var self = this,
        Article = self.db.model('Article'),
        article = new Article(),
        id;

    if (!element.link) {
        return callback('link does not exist: ' + JSON.stringify(element));
    }

    id = crypto.createHash('md5').update(element.guid).digest('hex');

    return async.waterfall([
        function (cb) {
            Article.find({ 'id': id }, cb);
        },
        function (documents, cb) {
            if (documents.length === 0) {
                request(element.link, cb);
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
            art.link = element.link;

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
