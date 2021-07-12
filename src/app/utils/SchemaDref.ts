//TODO: use https://www.npmjs.com/package/json-schema-ref-parser
export class SchemaDref {
    static original;
    static parse(schema) {
        SchemaDref.original = schema;
        return SchemaDref.derefSchema(schema);
    };

    static getRefSchema(parent, refObj) {
        var refType = SchemaDref.getRefType(refObj);
        var refVal = SchemaDref.getRefValue(refObj);

        if (refType === 'local') {
            return SchemaDref.getRefPathValue(parent, refVal);
        }
    }

    static derefSchema(schema) {

        var keys = Object.keys(schema);
        for (var i = 0; i < keys.length; i++) {
            var node = schema[keys[i]];
            if (node && node['$ref'] && typeof node['$ref'] === 'string') {
                var newValue = SchemaDref.getRefSchema(schema, node);
                if (newValue) {
                    var value = SchemaDref.derefSchema(newValue);
                    if (value || newValue) {
                        schema[keys[i]] = (value || newValue);
                        //this.update(value || newValue);
                    }
                }
            } else if (typeof node === 'object') {
                schema[keys[i]] = SchemaDref.derefSchema(node);
            } else if (keys[i] === '$ref') {
                var newValue = SchemaDref.getRefSchema(schema, schema);
                if (newValue) {
                    var value = SchemaDref.derefSchema(newValue);
                    if (value || newValue) {
                        schema = value || newValue;
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
    static deref(schema) {
        return SchemaDref.derefSchema(schema);
    }

    /**
     * Gets the ref value of a search result from prop-search or ref object
     * @param ref The search result object from prop-search
     * @returns {*} The value of $ref or undefined if not present in search object
     */
    static getRefValue(ref) {
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
    static getRefType(ref) {
        var val = SchemaDref.getRefValue(ref);
        if (val && (val.charAt(0) === '#')) {
            return 'local';
        }
    };

    /**
     * Determines if object is a $ref object. That is { $ref: <something> }
     * @param thing object to test
     * @returns {boolean} true if passes the test. false otherwise.
     */
    static isRefObject(thing) {
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
    static getRefPathValue(schema, refPath) {
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
            return SchemaDref.getValueFromPath(rpath, SchemaDref.original);
        }
    };

    static getValueFromPath(path, obj) {
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
            return SchemaDref.getValueFromPath(pathParts.join('.'), newObj);
        } else {
            return newObj;
        }
    }
}