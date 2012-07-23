fibrous = require 'fibrous'
Future = require 'fibers/future'

a = (x, y, callback) -> callback(null, x, y)

f = (x, y) ->
  fut = new Future()
  func

b = fibrous -> a.sync(1, 2)

b (err, res) ->
  if err? console.error(err)
  else console.log("Sucess!! #{res}")
