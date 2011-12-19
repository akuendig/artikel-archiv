var request = require('request');

exports.create = function (urls, options) {
    return new DownloadStack(urls, options);
}

var DownloadStack = function (urls) {

    this._running = false;
    this._downloading = false;
    this._current = null;
    this._nextUrls = [];
    this._previouseUrls = [];
    
    this._nextUrls.push(urls);

    this.next();
};

DownloadStack.prototype.push = function (url, callback) {
    this._nextUrls.push({ url: url, callback: callback });
    this.next();
};

DownloadStack.prototype._next = function () {
    var current; 

    if (this._downloading) {
        return;
    }

    current = this.current =  this._nextUrls.shift();

    if (!current) {
        return;
    }

    this._beginDownload();
};

DownloadStack.prototype._beginDownload = function () {
    var current = this._current,
        downloading = this._downloading;

    if (downloading) {
        throw "Cannot begin download if already downloading!";
    }

    if (!current) {
        return;
    }

    return request(current.url, function (err, res, body) {
        this._downloading = false;
        current.callback.call(err, res, body);

        this._next();
    });
};
