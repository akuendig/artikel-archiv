"use strict";
var express = require('express'),
    mongoose = require('mongoose'),
    async = require('async'),
    tagi = require('./lib/tagi'),
    minuten = require('./lib/minuten'),
    blick = require('./lib/blick'),
    logger = require('./lib/logger').createLogger(),
    app = express.createServer();

app.configure(function () {
    app.use(express.logger());
    app.use(express.errorHandler({
        dumpExceptions: true,
        showStack: true
    }));
});

// Webserver rendering
// *******************

function renderArticles(paper, callback) {
    var text = '',
        stream;

    switch (paper) {
    case 'tagi':
        stream =
            mongoose.
            createConnection('mongodb://localhost/tagi').
            model('Article').
            find().
            limit(40).
            select(['id', 'title', 'summary', 'link']).
            asc('title').
            stream();
        break;
    case 'min':
        stream =
            mongoose.
            createConnection('mongodb://localhost/min20').
            model('Article').
            find().
            limit(40).
            select(['id', 'title', 'summary', 'link']).
            asc('title').
            stream();
        break;
    case 'blick':
        stream =
            mongoose.
            createConnection('mongodb://localhost/blick').
            model('Article').
            find().
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

// Webserver
// *********

app.get('/', function (req, res) {
    res.writeHeader(200, {"Content-Type": "text/html; charset=utf-8"});

    res.write('<form action="poll" method="post"><input type="submit" value="Poll" /></form>');
    res.write('<form action="tagi" method="get"><input type="submit" value="Tagi" /></form>');
    res.write('<form action="min" method="get"><input type="submit" value="20 Minuten" /></form>');
    res.write('<form action="blick" method="get"><input type="submit" value="Blick" /></form>');
    res.write('<form action="/admin/errors" method="get"><input type="submit" value="Errors" /></form>');

    res.end();
});

app.get('/tagi/:id?', function (req, res) {
    var id = req.params.id;

    res.writeHeader(200, {"Content-Type": "text/html; charset=utf-8"});

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
                res.end(text);
            }
        });
    }
});

app.get('/min/:id?', function (req, res) {
    var id = req.params.id;
    
    res.writeHeader(200, {"Content-Type": "text/html; charset=utf-8"});

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
                res.end(text);
            }
        });
    }
});

app.get('/blick/:id?', function (req, res) {
    var id = req.params.id;
    
    res.writeHeader(200, {"Content-Type": "text/html; charset=utf-8"});

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

app.listen(process.env.PORT || 3000);

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
