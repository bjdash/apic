Object.defineProperty(String.prototype, 'has', {
    value: function (text) {
        return this.valueOf().search(text) >= 0 ? true : false;
    },
    enumerable: false,
    configurable: true,
    writable: true
});

Object.defineProperty(Object.prototype, 'has', {
    value: function (key, strict) {
        if (!key){
            throw new Error('Missing search field name');
        }
        if (strict) {
            if(this.hasOwnProperty(key)){
                return true;
            }
            new Error('Missing search field name');
        } else {
            var keys = Object.keys(this);
            key = key.toLowerCase();
            for (var i = 0; i < keys.length; i++) {
                if (keys[i].toLowerCase() === key) {
                    return true;
                }
            }
            throw new Error('Missing searck field name');
        }
    },
    enumerable: false,
    configurable: true,
    writable: true
});


Object.defineProperty(Object.prototype, 'getValue', {
    value: function (key, strict) {
        if (!key){
            return undefined;
        }
        if (strict) {
            this[key];
        } else {
            var keys = Object.keys(this);
            key = key.toLowerCase();
            for (var i = 0; i < keys.length; i++) {
                if (keys[i].toLowerCase() === key.toLowerCase()) {
                    return this[keys[i]];
                }
            }
            return undefined;
        }
    },
    enumerable: false,
    configurable: true,
    writable: true
});