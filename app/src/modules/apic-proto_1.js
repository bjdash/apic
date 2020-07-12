String.prototype.has = function (text) {
    return this.valueOf().search(text) >= 0 ? true : false;
};

Object.prototype.has = function (key, strict) {
    if (!key){
        return false;
    }
    if (strict) {
        return this.hasOwnProperty(key);
    } else {
        var keys = Object.keys(this);
        key = key.toLowerCase();
        for (var i = 0; i < keys.length; i++) {
            if (keys[i].toLowerCase() === key) {
                return true;
            }
        }
        return false;
    }
};

Object.prototype.getValue = function (key, strict) {
    if (!key){
        return undefined;
    }
    if (strict) {
        this[key];
    } else {
        var keys = Object.keys(this);
        key = key.toLowerCase();
        for (var i = 0; i < keys.length; i++) {
            if (keys[i].toLowerCase() === key) {
                return this[keys[i]];
            }
        }
        return undefined;
    }
};