var zlib,
    mongoose = require('mongoose'),
    Schema = mongoose.Schema;

// try using zlib

try {
    zlib = require('zlib');
} catch (exception) {
    console.log('zlib not available');
}

// define article schema

var Article = new Schema({
    id: { type: String, index: { unique: true } },
    title: String,
    summary: String,
    pubDate: Date,
    link: String,
    site: {
        data: String,
        compressed: Boolean }
});

Article.methods.getSite = function (callback) {
    var raw = this.site;

    if (raw.compressed) {
        if (!zlib) {
            return callback('Not posible to decrypt data because node version < v0.6');
        }

        return zlib.inflate(new Buffer(raw.data, 'base64'), function (error, buffer) {
            callback(error, buffer.toString());
        });
    }

    return callback(null, raw.data);
};

Article.methods.setSite = function (data, compress, callback) {
    var self = this,
        zlibMissing = !zlib;

    if (typeof compress === 'function') {
        callback = compress;
        compress = !zlibMissing;
    }

    if (compress === true) {
        if (zlibMissing) {
            return callback('Not posible to decrypt data because the zlib library is not part of the stl.');
        }

        return zlib.deflate(data, function (error, buffer) {
            if (error) {
                return callback(error);
            }

            self.site = { data: buffer.toString('base64'), compressed: true };
            return callback(null);
        });
    } else {
        self.site = { data: data, compressed: false };
        return callback(null);
    }
};

exports = module.exports = mongoose.model('Article', Article);
