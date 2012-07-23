zlib = require('zlib')
process = require('process')
mongoose = require('mongoose')
Schema = mongoose.Schema

Article = new Schema
  id:
    type:   String
    index:
      unique: true
  title:      String
  summary:    String
  pubDate:    Date
  link:       String
  websiteraw: String

Article.methods.getSite = (callback) ->
  zlib.inflate(
    new Buffer(@websiteraw)
    (error, buffer) -> callback(error, buffer.toString())
  )

Article.methods.setSite = (data, callback) ->
  self = this

  zlib.deflate(
    data
    (error, buffer) ->
      if error then return callback(error)

      @websiteraw = buffer.toString()
      callback(null)
  )

exports = module.exports = mongoose.model('Article', Article);