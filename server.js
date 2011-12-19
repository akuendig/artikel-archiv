var zlib = require('zlib'),
    crypto = require('crypto'),
    httpAgent = require('http-agent'),
    request = require('request'),
    express = require('express'),
    mongoose = require('mongoose'),
    FeedParser = require('feedparser'),
    Step = require('step'),
    model = require('./model'),
    app = express.createServer();

app.get('/', function (req, res) {
        poll();

    //    Step(
    //        function () {
    //            Article.each({}, this);
    //        },
    //        function (error, document) {

    //        }

    res.send('Hello World! Reloaded :D');
});

app.listen(process.env.PORT || 3000);

function poll() {
    var parser = new FeedParser(),
        tagiDb = mongoose.createConnection('mongodb://localhost/tagi'),
        nzzDb = mongoose.createConnection('mongodb://localhost/nzz'),
        minDb = mongoose.createConnection('mongodb://localhost/min20'),
        agent = httpAgent.create('www.tagesanzeiger.ch', []),
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
        len = feeds.length;

    agent.start();


    parser.on('article', function (element) {
        checkArticle(element, agent, tagiDb);
    });

    parser.on('end', function (a, b, c) {
        i += 1;

        if (i < len) {
            parser.parseUrl(feeds[i]);
        } else {
            console.log('finished parsing feed');
        }
    });

    return parser.parseUrl(feeds[i]);
}

function checkArticle(element, agent, db) {
    var Article = db.model('Article'),
        md5,
        callback,
        id;

    if (!element.link) {
        return console.log('link does not exist: ' + JSON.stringify(element));
    }

    md5 = crypto.createHash('md5')
    id = md5.update(element.guid);
    id += md5.digest('hex');

    callback = function (error, agnt) {
        if (agnt.url === element.link) {
	    return;
        }

        agnt.removeListener('next', callback);

        Step(
            function () {
                if (!error) {
                    zlib.deflate(agnt.body, this);
                }
            },
            function (error, compressed) {
                if (!error) {
                    var article = new Article();

                    article.id = id;
                    article.title = element.title;
                    article.summary = element.summary;
                    article.pubDate = element.pubDate;
                    article.link = element.link;
                    article.site = compressed;

                    article.save(this);
                }
            },
            function (error) {
                if (error) {
                    console.log('could not save test article');
                }
            });

        agnt.next();
    };

    Article.find({ 'id': id }, function (error, documents) {
        if (!error && documents.length === 0) {
            agent.addListener('next', callback);
            agent.addUrl(element.link);
            //request(element.link, this);
        }
    });
}
