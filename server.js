var express = require('express'),
    mongoose = require('mongoose'),
    async = require('async'),
    tagi = require('./lib/tagi'),
    minuten = require('./lib/minuten'),
    logger = require('./lib/logger').createLogger(),
    app = express.createServer();

// Webserver

app.get('/', function (req, res) {
    res.send(
        '<form action="poll" method="post"><input type="submit" value="Poll" /></form>' +
        '<form action="tagi" method="get"><input type="submit" value="Tagi" /></form>' +
        '<form action="min" method="get"><input type="submit" value="20 Minuten" /></form>' +
        '<form action="/admin/errors" method="get"><input type="submit" value="Errors" /></form>');
});

app.get('/tagi/:id?', function (req, res) {
    var id = req.params.id;

    if (id) {
        renderArticle(id, 'tagi', function (error, text) {
            if (error) {
                logger.error(error);
                res.send('An error occured while querying the articles database: ' +  error);
            } else {
                res.send(text);
            }
        });
    } else {
        renderArticles('tagi', function (error, text) {
            if (error) {
                logger.error(error);
                res.send('An error occured while querying the articles database: ' +  error);
            } else {
                res.send(text);
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
                res.send('An error occured while querying the articles database: ' +  error);
            } else {
                res.send(text);
            }
        });
    } else {
        renderArticles('min', function (error, text) {
            if (error) {
                logger.error(error);
                res.send('An error occured while querying the articles database: ' +  error);
            } else {
                res.send(text);
            }
        });
    }
});

app.get('/admin/errors' , function (req, res) {
    logger.getAll(function (error, errors) {
        if (error) {
            res.send('An error occured while querying the log database:\n' + error);
        } else {
            for (var i = 0, len = errors.length; i < len; i += 1) {
                res.write(JSON.stringify(errors[i]) + '\n\n');
            }
            
            res.end();
        }
    });
});

app.post('/poll', function (req, res) {
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

    res.send();
});

app.listen(process.env.PORT || 3000);

// Webserver rendering

function renderArticles(paper, callback) {
    var text = '',
        stream;

    switch(paper) {
        case 'tagi':
            stream =
                mongoose.
                createConnection('mongodb://localhost/tagi')
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
        default:
            return callback('ERROR! Unable to render articles from: ' + paper);
    };
        

    stream.on('error', callback);
    stream.on('data', function (doc) {
        text += '<li><a href="/tagi/' +
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
        default:
            callback('ERROR! Could not render article. Id: ' + id + ', Paper: ' + paper);
    };
}
