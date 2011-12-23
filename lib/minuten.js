"use strict";
var async = require('async'),
    crypto = require('crypto'),
    request = require('request'),
    mongoose = require('mongoose'),
    FeedParser = require('feedparser'),
    Article = require('./models/article');

var Minuten = function () {
    this.db = mongoose.createConnection('mongodb://localhost/min20');
};

module.exports = new Minuten();

Minuten.prototype.get = function (id, callback) {
    this.
        db.
        model('Article').
        findOne({id: id}, callback);
};

Minuten.prototype.poll = function (callback) {
    var self = this,
        feeds = [
            'http://www.20min.ch/rss/rss.tmpl?type=channel&get=1', // Front
            'http://www.20min.ch/rss/rss.tmpl?type=channel&get=4', // News
            'http://www.20min.ch/rss/rss.tmpl?type=rubrik&get=3', // Ausland
            'http://www.20min.ch/rss/rss.tmpl?type=rubrik&get=2', // Schweiz
            'http://www.20min.ch/rss/rss.tmpl?type=channel&get=8', // Wirtschaft
            'http://www.20min.ch/rss/rss.tmpl?type=rubrik&get=19', // Zuerich
            'http://www.20min.ch/rss/rss.tmpl?type=rubrik&get=20', // Bern
            'http://www.20min.ch/rss/rss.tmpl?type=rubrik&get=2087', // Mittelland
            'http://www.20min.ch/rss/rss.tmpl?type=rubrik&get=21', // Basel
            'http://www.20min.ch/rss/rss.tmpl?type=rubrik&get=112', // Zentralschweiz
            'http://www.20min.ch/rss/rss.tmpl?type=rubrik&get=126', // Ostschweiz
            'http://www.20min.ch/rss/rss.tmpl?type=rubrik&get=13', // Panorama
            'http://www.20min.ch/rss/rss.tmpl?type=channel&get=28', // People
            'http://www.20min.ch/rss/rss.tmpl?type=channel&get=9', // Sport
            'http://www.20min.ch/rss/rss.tmpl?type=channel&get=10', // Digital
            'http://www.20min.ch/rss/rss.tmpl?type=channel&get=11', // Auto
            'http://www.20min.ch/rss/rss.tmpl?type=channel&get=25' // Life
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


Minuten.prototype._checkArticle = function (element, callback) {
    var self = this,
        Article = self.db.model('Article'),
        article = new Article(),
        id;

    if (!element.link) {
        return callback('link does not exist: ' + JSON.stringify(element));
    }

    id = crypto.createHash('md5').update(element.link).digest('hex');

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
