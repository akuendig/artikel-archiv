"use strict";
var async = require('async'),
    crypto = require('crypto'),
    request = require('request'),
    mongoose = require('mongoose'),
    FeedParser = require('feedparser'),
    Article = require('./models/article');

var Blick = function () {
    this.db = mongoose.createConnection('mongodb://localhost/blick');
};

module.exports = new Blick();

Blick.prototype.get = function (id, callback) {
    this.
        db.
        model('Article').
        findOne({id: id}, callback);
};

Blick.prototype.poll = function (callback) {
    var self = this,
        feeds = [
            'http://www.blick.ch/news/rss.xml', // News
            'http://www.blick.ch/news/schweiz/rss.xml', // News/Schweiz
            'http://www.blick.ch/news/schweiz/aargau/rss.xml', // News/Schweiz/Aargau
            'http://www.blick.ch/news/schweiz/basel/rss.xml', // News/Schweiz/Basel
            'http://www.blick.ch/news/schweiz/bern/rss.xml', // News/Schweiz/Bern
            'http://www.blick.ch/news/schweiz/graubuenden/rss.xml', // News/Schweiz/Graubuenden
            'http://www.blick.ch/news/schweiz/ostschweiz/rss.xml', // News/Schweiz/Ostschweiz
            'http://www.blick.ch/news/schweiz/tessin/rss.xml', // News/Schweiz/Tessin
            'http://www.blick.ch/news/schweiz/westschweiz/rss.xml', // News/Schweiz/Westschweiz
            'http://www.blick.ch/news/schweiz/zentralschweiz/rss.xml', // News/Schweiz/Zentralschweiz
            'http://www.blick.ch/news/schweiz/zuerich/rss.xml', // News/Schweiz/Zuerich
            'http://www.blick.ch/news/ausland/rss.xml', // News/Ausland
            'http://www.blick.ch/news/wirtschaft/rss.xml', // News/Wirtschaft
            'http://www.blick.ch/news/wissenschaftundtechnik/rss.xml', // Wissen
            'http://www.blick.ch/sport/rss.xml', // Sport
            'http://www.blick.ch/sport/fussball/rss.xml', // Sport/Fussball
            'http://www.blick.ch/sport/eishockey/rss.xml', // Sport/Eishockey
            'http://www.blick.ch/sport/ski/rss.xml', // Sport/Ski
            'http://www.blick.ch/sport/tennis/rss.xml', // Sport/Tennis
            'http://www.blick.ch/sport/formel1/rss.xml', // Sport/Formel 1
            'http://www.blick.ch/sport/rad/rss.xml', // Sport/Rad
            'http://www.blick.ch/people/rss.xml', // People
            'http://www.blick.ch/unterhaltung/rss.xml', // Unterhaltung
            'http://www.blick.ch/life/rss.xml', // Life
            'http://www.blick.ch/life/mode/rss.xml', // Life/Mode & Beauty
            'http://www.blick.ch/life/gourmet/rss.xml', // Life/Gourmet
            'http://www.blick.ch/life/digital/rss.xml' // Life/Digital
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


Blick.prototype._checkArticle = function (element, callback) {
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
                request(element.guid, cb);
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
            art.link = element.guid;

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
