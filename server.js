var crypto = require('crypto'),
    express = require('express'),
    mongoose = require('mongoose'),
    FeedParser = require('feedparser'),
    Step = require('step'),
    model = require('./lib/model'),
    DownloadStack = require('./lib/download-stack');
    app = express.createServer();

// Webserver

app.get('/', function (req, res) {
    renderArticles('tagi', function (error, text) {
        res.send(text);
    });
});
app.get('/article/:id', function (req, res) {
    renderArticle(req.params.id, function (error, text) {
        res.send(text);
    });
});
app.get('/poll', function (req, res) {
    pollTagi(function (error) {
        if (error) {
            res.send('An error occured:\n' + JSON.stringify(error));
        } else {
            res.send('Successfully checked tagi rss feeds.');
        }
    });
});

app.listen(process.env.PORT || 3000);

// Webserver rendering

function renderArticles(paper, callback) {
    switch(paper) {
        case 'tagi':
            var db = mongoose.createConnection('mongodb://localhost/tagi'),
                text = '',
                stream;
            
            stream = db.
                model('Article').
                find().
                select(['id', 'title', 'summary', 'link']).
                asc(['title']).
                stream();

            stream.on('error', callback);
            stream.on('data', function (doc) {
                text += '<li><a href="/article/' +
                    doc.id + '"><h4>' +
                    doc.title + '</h4></a><h6>' +
                    doc.link + '</h6><div>' +
                    doc.summary + '</div></li>\n';
            });
            stream.on('close', function () {
                callback(null, text);
            });
            break;
        default:
            console.error('unable to render articles from: ' + paper);
    };
}

function renderArticle(id, callback) {
    var db = mongoose.createConnection('mongodb://localhost/tagi'),
        stream,
        text = '';    

    Step(
        function () {
            db.
                model('Article').
                findOne({id: id}).
                select(['site', 'link']).
                run(this);
        },
        function (error, documents) {
            var doc = documents[0];

            if (error) {
                return callback(error);
            }
            
            doc.getSite(this);
        },
        function (error, site) {
            if (error) {
                return callback(error);
            }

            return callback(null, site);
        });
}

// Article polling

function poll() {
    pollTagi();
}

function pollTagi(callback) {
    var parser = new FeedParser(),
        stacks = [ DownloadStack.create(), DownloadStack.create() ],
        db = mongoose.createConnection('mongodb://localhost/tagi'),
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
        elements = [];

    parser.on('end', function (articles) {
        i += 1;
        elements = elements.concat(articles);

        if (i < len) {
            parser.parseUrl(feeds[i]);
        } else {
            Step(
                function () {
                    var i = 0,
                        len = elements.length;

                    for (; i < len; i += 1) {
                        checkTagiArticle(elements[i], stacks[i % 2], db, this.parallel());
                    }
                },
                function (error) {
                    if (error) {
                        console.error('Errors during article update: ' + JSON.stringify(error));
                    } else {
                        console.log('successfully checked tagi rss feeds.');
                    }

                    db.close();
                    callback(error);
                });
        }
    });

    return db.on('open', function () {
        parser.parseUrl(feeds[i]);
    });
}

function checkTagiArticle(element, stack, db, callback) {
    var Article = db.model('Article'),
        article = new Article(),
        id;

    if (!element.link) {
        return callback('link does not exist: ' + JSON.stringify(element));
    }

    id = crypto.createHash('md5').update(element.guid).digest('hex');

    return Step(
        function () {
            Article.find({ 'id': id }, this);
        },
        function (error, documents) {
            if (!error && documents.length === 0) {
                stack.push(element.link, this);
            } else {
                callback(error);
            }
        },
        function (error, response, body) {
            if (!error) {
                article.setSite(body, this);
            } else {
                callback(error);
            }
        },
        function (error, compressed) {
            if (!error) {
                var art = article;

                art.id = id;
                art.title = element.title;
                art.summary = element.summary;
                art.pubDate = element.pubDate;
                art.link = element.link;

                art.save(this);
            } else {
                callback(error);
            }
        },
        callback);
}
