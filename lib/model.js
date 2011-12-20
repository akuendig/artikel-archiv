var zlib,
    mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId;

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
    site: { type: { data: String, compressed: Boolean } }
});

Article.methods.getSite = function (callback) {
    var raw = this.site;

    if (raw.compressed) {
        if (!zlib) {
            return callback('Not posible to decrypt data because node version < v0.6');
        }

        return zlib.inflate(raw.data, callback);
    }

    return callback(null, raw.data);
};

Article.methods.setSite = function (data, compress, callback) {
    var zlibMissing = !zlib;

    callback = callback || typeof compress === 'function' ? compress : function() {};

    if (compress === true) {
        if (zlibMissing) {
            return callback('Not posible to decrypt data because node version < v0.6');
        }

        return zlib.deflate(data, function (error, compressed) {
            if (error) {
                return callback(error);
            }

            this.site = { data: compressed, compressed: true };
            return callback(null);
        });
    }
    
    if (zlibMissing || compress === false) {
        this.site = { data: data, compressed: false };
        return callback(null);
    }
    
    return zlib.deflate(data, function (error, compressed) {
        if (error) {
            return callback(error);
        }

        this.site = { data: compressed, compressed: true };
        return callback(null);
    });
};

mongoose.model('Article', Article);
