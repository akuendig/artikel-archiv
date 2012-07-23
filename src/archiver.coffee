"use strict"
crypto = require('crypto')
request = require('request')
fibrous = require('fibrous')
mongoose = require('mongoose')
FeedParser = require('feedparser')
Article = require('./models/article')

module.exports = class Archiver
  constructor: (options) ->
    return if not options?

    @_db = mongoose.createConnection(options.database)
    @feeds = options.feeds? []
    @selectLinkFunc = options.selectLink? @defaultLinkSelect

  get: (id, callback) ->
    @_db
      .model('Article')
      .findOne(id: id, callback)

  query = () ->
    @_db
      .model('Article')
      .find()

  poll: fibrous () ->
    @feeds.map (feed) ->
      req =
        'uri': feeds
        # 'If-Modified-Since' : <your cached 'lastModified' value>
        # 'If-None-Match' : <your cached 'etag' value>

      parser = new FeedParser()
      parser.sync.parseStream request(req)


    futures = []
    parseSeq = Future.wrap(parser.parseStream)

    @feeds.forEach (feed) ->
      #TODO here is an error, one error should take down all others

      parser.parseStream request(req), (err, meta, art) ->
        if err? then return callback(err)

        articles = articles.concat(art)

  checkArtFunc: fibrous (element, callback) ->
    Article = @_db.model('Article')
    link = @selectLinkFunc(element)

    if not link? then return callback('link does not exist: ' + JSON.stringify(element))

    id = crypto.createHash('md5').update(link).digest('hex');

    # return if article already exists
    return if Article.sync.count(id: id) > 0

    resp = request.sync.get(link)

    # return if there is no body
    return if not resp.body

    article = new Article()
    article.id = id
    article.title = element.title
    article.summary = element.summary
    article.pubDate = element.pubDate
    article.link = link

    article.sync.setSite(resp.body)
    article.sync.save(cb)

  defaultLinkSelect: (element) -> return element.link;
