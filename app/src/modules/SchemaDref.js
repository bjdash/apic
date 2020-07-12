(function () {

    var SchemaDref = {};

    SchemaDref.original;
    SchemaDref.parse = function (schema) {
        SchemaDref.original = schema;
        return derefSchema(schema);
    };

    function getRefSchema(parent, refObj) {
        var refType = getRefType(refObj);
        var refVal = getRefValue(refObj);

        if (refType === 'local') {
            return getRefPathValue(parent, refVal);
        }
    }

    function derefSchema(schema) {

        var keys = Object.keys(schema);
        for (var i = 0; i < keys.length; i++) {
            var node = schema[keys[i]];
            if (node && node['$ref'] && typeof node['$ref'] === 'string') {
                var newValue = getRefSchema(schema, node);
                if (newValue) {
                    var value = derefSchema(newValue);
                    if (value || newValue) {
                        schema[keys[i]] = (value || newValue);
                        //this.update(value || newValue);
                    }
                }
            } else if (typeof node === 'object') {
                schema[keys[i]] = derefSchema(node);
            }else if(keys[i] === '$ref'){
                var newValue = getRefSchema(schema, schema);
                if (newValue) {
                    var value = derefSchema(newValue);
                    if (value || newValue) {
                        schema = value|| newValue;
                        //this.update(value || newValue);
                    }
                }
            }
        }

        return schema;
    }

    /**
     * Derefs `$ref`'s in json schema to actual resolved values.
     * Supports local, file and web refs.
     * @param schema The json schema
     * @returns {*}
     */
    function deref(schema) {
        return derefSchema(schema);
    }

    /**
     * Gets the ref value of a search result from prop-search or ref object
     * @param ref The search result object from prop-search
     * @returns {*} The value of $ref or undefined if not present in search object
     */
    function getRefValue(ref) {
        var thing = ref ? (ref.value ? ref.value : ref) : null;
        if (thing && thing.$ref && typeof thing.$ref === 'string') {
            return thing.$ref;
        }
    };

    /**
     * Gets the type of $ref from search result object.
     * @param ref The search result object from prop-search or a ref object
     * @returns {string}  `local` if it's a link to local schema.
     *                    undefined otherwise
     */
    function getRefType(ref) {
        var val = getRefValue(ref);
        if (val && (val.charAt(0) === '#')) {
            return 'local';
        }
    };

    /**
     * Determines if object is a $ref object. That is { $ref: <something> }
     * @param thing object to test
     * @returns {boolean} true if passes the test. false otherwise.
     */
    function isRefObject(thing) {
        if (thing && typeof thing === 'object' && !Array.isArray(thing)) {
            var keys = Object.keys(thing);
            return keys.length === 1 && keys[0] === '$ref' && typeof thing['$ref'] === 'string';
        }
        return false;
    };

    /**
     * Gets the value at the ref path within schema
     * @param schema the (root) json schema to search
     * @param refPath string ref path to get within the schema. Ex. `#/definitions/id`
     * @returns {*} Returns the value at the path location or undefined if not found within the given schema
     */
    function getRefPathValue(schema, refPath) {
        var rpath = refPath;
        var hashIndex = refPath.indexOf('#');
        if (hashIndex >= 0) {
            rpath = refPath.substring(hashIndex);
            if (rpath.length > 1) {
                rpath = refPath.substring(1);
            } else {
                rpath = '';
            }
        }

        if (rpath.charAt(0) === '/') {
            rpath = rpath.substring(1);
        }

        if (rpath.indexOf('/') >= 0) {
            rpath = rpath.replace(/\//gi, '.');
        }

        if (rpath) {
            return getValueFromPath(rpath, SchemaDref.original);
        }
    };

    function getValueFromPath(path, obj) {
        var curPath = '',
        pathParts = [];
        if (path.indexOf('.') > 0) {
            pathParts = path.split('.');
        } else {
            pathParts.push(path);
        }
        curPath = pathParts.shift();
        var newObj = obj[curPath];

        if (pathParts.length > 0) {
            return getValueFromPath(pathParts.join('.'), newObj);
        } else {
            return newObj;
        }
    }

    window.SchemaDref = SchemaDref;

})();
