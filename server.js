var express = require('express'),
    mongoose = require('mongoose'),
    async = require('async'),
    tagi = require('./lib/tagi'),
    logger = require('./lib/logger').createLogger(),
    app = express.createServer();

// Webserver

app.get('/', function (req, res) {
    renderArticles('tagi', function (error, text) {
        if (error) {
            logger.error(error);
            res.send('An error occured while querying the articles database: ' +  error);
        } else {
            res.send('<form action="poll" method="post"><input type="submit"></input></form>\n' + text);
        }
    });
});

app.get('/:paper/:id', function (req, res) {
    renderArticle(req.params.id, req.params.paper, function (error, text) {
        if (error) {
            logger.error(error);
            res.send('An error occured while querying the articles database: ' +  error);
        } else {
            res.send(text);
        }
    });
});

app.get('/errors' , function (req, res) {
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
    var db = tagi.createDatabase();

    db.poll(function (error) {
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
    switch(paper) {
        case 'tagi':
            var db = mongoose.createConnection('mongodb://localhost/tagi'),
                text = '',
                stream;
            
            stream = db.
                model('Article').
                find().
                limit(40).
                select(['id', 'title', 'summary', 'link']).
                asc(['title']).
                stream();

            stream.on('error', callback);
            stream.on('data', function (doc) {
                text += '<li><a href="/tagi/' +
                    doc.id + '"><h4>' +
                    doc.title + '</h4></a>'; /*<h6>' +
                    doc.link + '</h6><div>' +
                    doc.summary + '</div></li>\n';*/
            });
            stream.on('close', function () {
                callback(null, text);
            });
            break;
        default:
            console.error('unable to render articles from: ' + paper);
    };
}

function renderArticle(id, paper, callback) {
    switch (paper) {
        case 'tagi':
            async.waterfall([
                function (cb) {
                    tagi.
                        createDatabase().
                        get(id, cb);
                },
                function (doc, cb) {
                    doc.getSite(cb);
                },
                function (site, cb) {
                    cb(null, site);
                }],
                callback);
            break;
        default:
            callback('Could not render article. Id: ' + id + ', Paper: ' + paper);
    };
}
