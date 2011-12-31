"use strict";
var express = require('express'),
    mongoose = require('mongoose'),
    async = require('async'),
    archiver = require('./lib/archiver'),
    logger = require('./lib/logger').createLogger(),
    tagi,
    minuten,
    blick,
    app = express.createServer();

app.configure(function () {
    app.use(express.logger());
    app.use(express.errorHandler({
        dumpExceptions: true,
        showStack: true
    }));
});

// Web server rendering
// *******************

function renderArticles(paper, callback) {
    var text = '',
        stream;

    switch (paper) {
    case 'tagi':
        stream =
            tagi.
            query().
            limit(40).
            select(['id', 'title', 'summary', 'link']).
            asc('title').
            stream();
        break;
    case 'min':
        stream =
            minuten.
            query().
            limit(40).
            select(['id', 'title', 'summary', 'link']).
            asc('title').
            stream();
        break;
    case 'blick':
        stream =
            blick.
            query().
            limit(40).
            select(['id', 'title', 'summary', 'link']).
            asc('title').
            stream();
        break;
    default:
        return callback('ERROR! Unable to render articles from: ' + paper);
    }

    stream.on('error', callback);
    stream.on('data', function (doc) {
        text += '<li><a href="/' + paper + '/' +
            doc.id + '"><h4>' +
            doc.title + '</h4></a>';
    });

    return stream.on('close', function () {
        //var self = this;
        callback(null, text);
    });
}

function renderArticle(id, paper, callback) {
    switch (paper) {
    case 'tagi':
        async.waterfall([
            function (cb) {
                tagi.get(id, cb);
            },
            function (doc, cb) {
                doc.getSite(cb);
            }],
            callback);
        break;
    case 'min':
        async.waterfall([
            function (cb) {
                minuten.get(id, cb);
            },
            function (doc, cb) {
                doc.getSite(cb);
            }],
            callback);
        break;
    case 'blick':
        async.waterfall([
            function (cb) {
                blick.get(id, cb);
            },
            function (doc, cb) {
                doc.getSite(cb);
            }],
            callback);
        break;
    default:
        return callback('ERROR! Could not render article. Id: ' + id + ', Paper: ' + paper);
    }
}

// Web server
// *********

app.get('/', function (req, res) {
    res.writeHeader(200, {"Content-Type": "text/html; charset=utf-8"});

    //res.write('<form action="poll" method="post"><input type="submit" value="Poll" /></form>');
    res.write(process.env.ABC);
    res.write('<form action="tagi" method="get"><input type="submit" value="Tagi" /></form>');
    res.write('<form action="min" method="get"><input type="submit" value="20 Minuten" /></form>');
    res.write('<form action="blick" method="get"><input type="submit" value="Blick" /></form>');
    res.write('<form action="/admin/errors" method="get"><input type="submit" value="Errors" /></form>');

    res.end();
});

app.get('/tagi/:id?', function (req, res) {
    var id = req.params.id;

    if (id) {
        renderArticle(id, 'tagi', function (error, text) {
            if (error) {
                logger.error(error);
                res.end('An error occured while querying the articles database: ' +  error);
            } else {
                res.end(text);
            }
        });
    } else {
        renderArticles('tagi', function (error, text) {
            if (error) {
                logger.error(error);
                res.end('An error occured while querying the articles database: ' +  error);
            } else {
                res.writeHeader(200, {"Content-Type": "text/html; charset=utf-8"});
                res.end(text);
            }
        });
    }
});

app.get('/min/:id?', function (req, res) {
    var id = req.params.id;

    if (id) {
        renderArticle(id, 'min', function (error, text) {
            if (error) {
                logger.error(error);
                res.end('An error occured while querying the articles database: ' +  error);
            } else {
                res.end(text);
            }
        });
    } else {
        renderArticles('min', function (error, text) {
            if (error) {
                logger.error(error);
                res.end('An error occured while querying the articles database: ' +  error);
            } else {
                res.writeHeader(200, {"Content-Type": "text/html; charset=utf-8"});
                res.end(text);
            }
        });
    }
});

app.get('/blick/:id?', function (req, res) {
    var id = req.params.id;

    if (id) {
        renderArticle(id, 'blick', function (error, text) {
            if (error) {
                logger.error(error);
                res.end('An error occured while querying the articles database: ' +  error);
            } else {
                res.end(text);
            }
        });
    } else {
        renderArticles('blick', function (error, text) {
            if (error) {
                logger.error(error);
                res.end('An error occured while querying the articles database: ' +  error);
            } else {
                res.writeHeader(200, {"Content-Type": "text/html; charset=utf-8"});
                res.end(text);
            }
        });
    }
});

app.get('/admin/errors', function (req, res) {
    logger.getAll(function (error, errors) {
        var i,
            len,
            err;
        if (error) {
            res.send('An error occured while querying the log database:\n' + error);
        } else {
            res.writeHeader(200, {"Content-Type": "text/html; charset=utf-8"});
            res.write('<table border="1"><tr><th>Time</th><th>Importance</th><th>Message</th></tr>');

            for (i = 0, len = errors.length; i < len; i += 1) {
                err = errors[i];

                res.write('<tr><td>' + err.date.toLocaleString() + '</td><td>' + err.importance + '</td><td>' + err.message + '</td></tr>');
            }

            res.end('</table>');
        }
    });
});

app.post('/poll', function (req, res) {
    blick.poll(function (error) {
        if (error) {
            logger.error(error);
        } else {
            logger.info('successfully checked Blick rss feeds.');
        }
    });

    minuten.poll(function (error) {
        if (error) {
            logger.error(error);
        } else {
            logger.info('successfully checked 20 Minuten rss feeds.');
        }
    });

    tagi.poll(function (error) {
        if (error) {
            logger.error(error);
        } else {
            logger.info('successfully checked tagi rss feeds.');
        }
    });

    res.writeHeader(200, {"Content-Type": "text/html"});
    res.end();
});

function bootstrap() {
    try {
        tagi = archiver.create({
            database: 'mongodb://localhost/tagi',
            feeds: [
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
            ]
        });

        blick = archiver.create({
            database: 'mongodb://localhost/blick',
            selectLink: function (element) {
                return element.guid;
            },
            feeds: [
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
            ]
        });

        minuten = archiver.create({
            database: 'mongodb://localhost/blick',
            feeds: [
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
            ]
        });

    } catch(exception) {
    }
    app.listen(process.env.PORT || 3000);
}

bootstrap();

// Intervall polling
// *****************

setInterval(function () {
    logger.info('########## Regular polling of news feeds ##########');

    try {
        blick.poll(function (error) {
            if (error) {
                logger.error(error);
            } else {
                logger.info('successfully checked Blick rss feeds.');
            }
        });

        minuten.poll(function (error) {
            if (error) {
                logger.error(error);
            } else {
                logger.info('successfully checked 20 Minuten rss feeds.');
            }
        });

        tagi.poll(function (error) {
            if (error) {
                logger.error(error);
            } else {
                logger.info('successfully checked tagi rss feeds.');
            }
        });
    } catch (error) {
        logger.error(error);
    }
}, 30 * 60 * 1000);
