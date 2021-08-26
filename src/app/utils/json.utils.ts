export class JsonUtils {
    static readonly supportType = ['string', 'number', 'array', 'object', 'boolean', 'integer'];

    static easyJsonSchema(data) {
        var JsonSchema = {};
        JsonUtils.parse(data, JsonSchema);
        return JsonSchema;
    }

    static isPlainObject(obj) {
        return obj ? typeof obj === 'object' && Object.getPrototypeOf(obj) === Object.prototype : false;
    }

    private static getType(type) {
        if (!type) type = 'string';
        if (JsonUtils.supportType.indexOf(type) !== -1) {
            return type;
        }
        return typeof type;
    }

    private static isSchema(object) {
        if (JsonUtils.supportType.indexOf(object.type) !== -1) {
            return true;
        }
        return false;
    }

    private static handleSchema(json, schema) {
        Object.assign(schema, json);
        if (schema.type === 'object') {
            delete schema.properties;
            JsonUtils.parse(json.properties, schema);
        }
        if (schema.type === 'array') {
            delete schema.items;
            schema.items = {};
            JsonUtils.parse(json.items, schema.items)
        }

    }

    private static handleArray(arr, schema) {
        schema.type = 'array';
        var props = schema.items = {};
        JsonUtils.parse(arr[0], props)
    }

    private static handleObject(json, schema) {
        if (JsonUtils.isSchema(json)) {
            return JsonUtils.handleSchema(json, schema)
        }
        schema.type = 'object';
        schema.required = [];
        var props = schema.properties = {};
        for (var key in json) {
            var item = json[key];
            var curSchema = props[key] = {};
            if (key[0] === '*') {
                delete props[key];
                key = key.substr(1);
                schema.required.push(key);
                curSchema = props[key] = {};

            }
            JsonUtils.parse(item, curSchema)
        }
    }

    private static parse(json, schema) {
        if (Array.isArray(json)) {
            JsonUtils.handleArray(json, schema)
        } else if (JsonUtils.isPlainObject(json)) {
            JsonUtils.handleObject(json, schema)
        } else {
            schema.type = JsonUtils.getType(json)
        }
    }

    // if (typeof module !== 'undefined' && typeof module === 'object' && module.exports !== 'undefined') {
    //     module.exports = ejs;
    // }

    // if (typeof window !== 'undefined' && typeof window === 'object') {
    //     window.easyJsonSchema = ejs;
    // }
}