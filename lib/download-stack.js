var request = require('request');

exports.create = function (urls) {
    return new DownloadStack(urls);
}

var DownloadStack = function (urls) {
    this._downloading = false;
    this._current = null;
    this._nextUrls = [];
    this._previouseUrls = [];
    
    this._nextUrls.push(urls);

    this._next();
};

DownloadStack.prototype.push = function (url, callback) {
    this._nextUrls.push({ url: url, callback: callback });
    this._next();
};

DownloadStack.prototype.length = function () {
    return this._nextUrls.length;
}

DownloadStack.prototype._next = function () {
    if (this._downloading) {
        return;
    }

    this._beginDownload();
};

DownloadStack.prototype._beginDownload = function () {
    var current,
        self = this;

    if (self._downloading) {
        throw 'Cannot begin download if already downloading!';
    }

    current = self.current =  self._nextUrls.shift();

    if (!current) {
        return;
    }

    this._downloading = true;

    return request(current.url, function (err, res, body) {
        self._downloading = false;

        current.callback(err, res, body);

        self._previouseUrls.push(current);
        self._next();
    });
};
