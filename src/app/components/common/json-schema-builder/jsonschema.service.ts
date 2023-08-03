
export class JsonSchemaService {

  private ENTITY_DEFAULTS = {
    _key: '',
    _title: '',
    _description: '',
    _$ref: '',
    _default: '',
    _enum: '',
    _type: '',
    _required: false,
    __ID__: '',
    _parent: '',
    _hideKey: false
  };

  readonly ENTITY_PROPS = {
    forObject: {
      _properties: [],
      _additionalProperties: [],
      _disallowAdditional: false,
      _maxProperties: undefined,
      _minProperties: undefined,
      _type: ['Object'],
      _hasChild: true
    },
    forString: {
      _format: '',
      _pattern: undefined,
      _maxLength: undefined,
      _minLength: undefined,
      _type: ['String']
    },
    forArray: {
      _items: [],
      _maxItems: undefined,
      _minItems: undefined,
      _uniqueItems: undefined,
      _type: ['Array']
    },
    forInteger: {
      _format: '',
      _maximum: undefined,
      _minimum: undefined,
      _exclusiveMaximum: undefined,
      _exclusiveMinimum: undefined,
      _multipleOf: undefined,
      _type: ['Integer']

    },
    forNumber: {
      _format: '',
      _maximum: undefined,
      _minimum: undefined,
      _exclusiveMaximum: undefined,
      _exclusiveMinimum: undefined,
      _multipleOf: undefined,
      _type: ['Number']

    },
    for$ref: {
      _type: ['$ref'],
      _value: '',
      _path: '#/definitions/'
    },
    forOneOf: {
      _type: ['OneOf'],
      _properties: [],
      _hasChild: true
    },
    forAnyOf: {
      _type: ['AnyOf'],
      _properties: [],
      _hasChild: true
    },
    forAllOf: {
      _type: ['AllOf'],
      _properties: [],
      _hasChild: true
    }
  };

  private ENTITY_AUTO_ID = 0

  constructor() {

  }

  deepCopy(x) {
    return JSON.parse(JSON.stringify(x));
  }

  newArray(key, parent?) {
    this.ENTITY_AUTO_ID += 1;
    var newArr = {
      ...this.ENTITY_DEFAULTS,
      ...this.deepCopy(this.ENTITY_PROPS.forArray),
      __ID__: '$model' + this.ENTITY_AUTO_ID,
      _key: key,
      _parent: (parent ?? '')
    };
    return newArr;
  };;

  newBoolean(key, parent?) {
    this.ENTITY_AUTO_ID += 1;
    var newBool = {
      ...this.ENTITY_DEFAULTS, _type: ['Boolean'],
      __ID__: '$model' + this.ENTITY_AUTO_ID,
      _key: key,
      _parent: (parent ?? '')
    };
    return newBool;
  };

  newInteger(key, parent?) {
    this.ENTITY_AUTO_ID += 1;
    var newInt = {
      ... this.ENTITY_DEFAULTS,
      ...this.deepCopy(this.ENTITY_PROPS.forInteger),
      __ID__: '$model' + this.ENTITY_AUTO_ID,
      _key: key,
      _parent: (parent ?? '')
    };
    return newInt;
  };

  newNumber(key, parent?) {
    this.ENTITY_AUTO_ID += 1;
    var newNum = {
      ...this.ENTITY_DEFAULTS,
      ...this.deepCopy(this.ENTITY_PROPS.forNumber),
      __ID__: '$model' + this.ENTITY_AUTO_ID,
      _key: key,
      _parent: (parent ?? '')
    };
    return newNum;
  };

  newNull(key, parent?) {
    this.ENTITY_AUTO_ID += 1;
    var newNull = {
      ...this.ENTITY_DEFAULTS,
      _type: ['Null'],
      __ID__: '$model' + this.ENTITY_AUTO_ID,
      _key: key,
      _parent: (parent ?? '')
    };
    return newNull;
  };

  newObject(key, props = null, parent?) {
    this.ENTITY_AUTO_ID += 1;
    var newObj = {
      ...this.ENTITY_DEFAULTS,
      ...this.deepCopy(this.ENTITY_PROPS.forObject),
      __ID__: '$model' + this.ENTITY_AUTO_ID,
      _key: key,
      _properties: props ?? [],
      _parent: (parent ?? '')
    };
    return newObj;
  };


  newString(key, required?, parent?) {
    this.ENTITY_AUTO_ID += 1;
    var newStr = {
      ...this.ENTITY_DEFAULTS,
      ...this.deepCopy(this.ENTITY_PROPS.forString),
      __ID__: '$model' + this.ENTITY_AUTO_ID,
      _key: key,
      _parent: (parent ?? ''),
      _required: required ?? false
    };
    return newStr;
  };


  new$ref(key, value?, parent?, path?) {
    this.ENTITY_AUTO_ID += 1;
    var newRef = {
      _type: ['$ref'],
      _value: value ?? '',
      _path: path ?? '#/definitions/',
      __ID__: '$model' + this.ENTITY_AUTO_ID,
      _key: key,
      _parent: (parent ?? '')
    };
    return newRef;
  };

  newXOf(type, key, props?, parent?) {
    this.ENTITY_AUTO_ID += 1;
    var newXOf = {
      ...this.ENTITY_DEFAULTS,
      ...this.deepCopy(this.ENTITY_PROPS['for' + type]),
      _properties: props || [],
      __ID__: '$model' + this.ENTITY_AUTO_ID,
      _key: key,
      _parent: (parent ?? '')
    };
    return newXOf;
  };

  getObjPropertyByKey(obj, key) {
    if (obj && obj._properties && obj._properties.length > 0) {
      var found = false;
      for (var i = 0; i < obj._properties.length; i++) {
        var prop = obj._properties[i];
        if (prop._key === key)
          found = prop;
        if (found)
          return found;
      }
    }
    return false;
  };


  obj2schema(entity: any, models: any[]) {
    var schema: any = {};
    schema.type = [];
    for (let x = 0; x < entity._type.length; x++) {
      const type = entity._type[x];
      switch (type) {
        case 'Object':
          schema.type.push('object');
          if (entity._description) {
            schema.description = entity._description;
          }
          if (entity._minProperties >= 0) {
            schema.minProperties = entity._minProperties;
          }
          if (entity._maxProperties >= 0) {
            schema.maxProperties = entity._maxProperties;
          }
          if (entity._disallowAdditional) {
            schema.additionalProperties = !entity._disallowAdditional;
          }
          if (entity._additionalProperties && entity._additionalProperties.length > 0) {
            schema.additionalProperties = this.obj2schema(entity._additionalProperties[0], models);
          }
          if (entity._properties.length > 0) {
            schema.properties = {};
            schema.required = [];
            for (var i = 0; i < entity._properties.length; i++) {
              var val = entity._properties[i];
              if (val && val._type) {
                var res = this.obj2schema(val, models);
                schema.properties[val._key] = res;
                if (val._required) {
                  schema.required.push(val._key);
                }
              }
            }
            if (schema.required.length === 0) {
              delete schema.required;
            }
          }
          break;
        case 'OneOf':
        case 'AnyOf':
        case 'AllOf':
          delete schema.type;
          schema[type[0].toLowerCase() + type.slice(1)] = [];
          if (entity._description) {
            schema.description = entity._description;
          }
          for (var i = 0; i < entity._properties.length; i++) {
            var val = entity._properties[i];
            if (val && val._type) {
              var res = this.obj2schema(val, models);
              schema[type[0].toLowerCase() + type.slice(1)].push(res);
            }
          }

          break;
        case 'String':
          schema.type.push('string');
          if (entity._description) {
            schema.description = entity._description;
          }
          if (entity._minLength >= 0) {
            schema.minLength = entity._minLength;
          }
          if (entity._maxLength >= 0) {
            schema.maxLength = entity._maxLength;
          }
          if (entity._pattern) {
            schema.pattern = entity._pattern;
          }
          if (entity._format) {
            schema.format = entity._format;
          }
          if (entity._default) {
            schema.default = entity._default;
          }
          if (entity._enum) {
            schema.enum = entity._enum;
          }
          break;
        case 'Array':
          schema.type.push('array');
          if (entity._description) {
            schema.description = entity._description;
          }
          if (entity._default) {
            schema.default = entity._default;
          }
          if (entity._uniqueItems) {
            schema.uniqueItems = entity._uniqueItems;
          }
          if (entity._minItems >= 0) {
            schema.minItems = entity._minItems;
          }
          if (entity._maxItems >= 0) {
            schema.maxItems = entity._maxItems;
          }
          if (entity._items && entity._items[0]) {
            schema.items = this.obj2schema(entity._items[0], models);
          }
          break;
        case 'Integer':
        case 'Number':
          schema.type.push(type === 'Integer' ? 'integer' : 'number');
          if (entity._description) {
            schema.description = entity._description;
          }
          if (entity._default) {
            schema.default = entity._default;
          }
          if (entity._minimum >= 0) {
            schema.minimum = entity._minimum;
          }
          if (entity._maximum >= 0) {
            schema.maximum = entity._maximum;
          }
          if (entity._exclusiveMinimum) {
            schema.exclusiveMinimum = entity._exclusiveMinimum;
          }
          if (entity._exclusiveMaximum) {
            schema.exclusiveMaximum = entity._exclusiveMaximum;
          }
          if (entity._multipleOf >= 0) {
            schema.multipleOf = entity._multipleOf;
          }
          if (entity._format) {
            schema.format = entity._format;
          }
          if (entity._enum) {
            schema.enum = entity._enum;
          }
          break;
        case 'Boolean':
          schema.type.push('boolean');
          if (entity._description) {
            schema.description = entity._description;
          }
          if (entity._default) {
            try {
              const bool = JSON.parse(entity._default);
              if (typeof bool === 'boolean') {
                schema.default = bool;
              }
            } catch (e) {

            }

          }
          break;
        case 'Null':
          schema.type.push('null');
          if (entity._description) {
            schema.description = entity._description;
          }
          if (entity._default) {
            schema.default = entity._default;
          }
          break;
        case '$ref':
          let path = '';
          if (models && models[entity._value] && models[entity._value].nameSpace) {
            path = models[entity._value].nameSpace;
          }
          schema.$ref = (entity._path || '#/definitions/') + (path || entity._value);
          delete schema.type;
      }
    }
    if (schema.type && schema.type.length === 1) {
      var t = schema.type[0];
      schema.type = t;
    }
    return schema;
  }


  copyProps(obj, newModel) {
    for (const key in newModel) {
      if (!key) {
        continue;
      }
      const val = newModel[key];
      if (!obj.hasOwnProperty(key)) {
        obj[key] = val;
      }
    };
  }

  schema2obj(originalSchema, key, required, isRoot, modelObjs, parent) {
    var schema = { ...originalSchema };
    //TODO: If schema has definitions defined, prepopulate modelObjs with that
    if (!schema) {
      schema = this.newObject('##ROOT##', null, '$response');
      schema.root$$ = true;
      return schema;
    }
    if (typeof schema === 'string') {
      try {
        schema = JSON.parse(schema);
      } catch (e) {
        return null;
      }
    }
    if (key === undefined) key = '##ROOT##';
    var parentDelim = '.';
    if (!key) parentDelim = '';
    if (!required) required = false;
    if (!parent) parent = '$response';

    var obj;
    //add type if missing
    if (!schema.type) {
      if (schema.properties) schema.type = 'object';
      else if (schema.items) schema.type = 'array';
      else if (schema.$ref) delete schema.type;
      else if (schema.oneOf) schema.type = 'OneOf';
      else if (schema.anyOf) schema.type = 'AnyOf';
      else if (schema.allOf) schema.type = 'AllOf';
      else schema.type = 'string';
    }
    if (!(schema.type instanceof Array)) {
      schema.type = [schema.type];
    }
    //var types = schema.type;
    for (var x = 0; x < schema.type.length; x++) {
      var type = schema.type[x];
      var newModel
      switch (type) {
        case 'object':
          newModel = { ...this.deepCopy(this.newObject(key, null, parent)) };
          if (obj && obj._type && obj._type.length > 0) {
            obj._type.push(newModel._type[0]);
            this.copyProps(obj, newModel);
          } else {
            obj = newModel;
          }

          if (schema.description) {
            obj._description = schema.description;
          }
          if (schema.minProperties >= 0) {
            obj._minProperties = schema.minProperties;
          }
          if (schema.maxProperties >= 0) {
            obj._maxProperties = schema.maxProperties;
          }
          if (schema.hasOwnProperty('additionalProperties')) {
            if (typeof schema.additionalProperties === 'boolean') {
              obj._disallowAdditional = !schema.additionalProperties;
            } else {
              var additionalProp = this.schema2obj(schema.additionalProperties, 'additionalProperties', false, false, modelObjs, '');
              additionalProp._key = 'additionalProperties';
              additionalProp._readOnlyKey = true;
              additionalProp._hideKey = true;

              obj._additionalProperties = [additionalProp]
            }
          }

          schema.properties && Object.keys(schema.properties).forEach(_key => {
            let entity = schema.properties[_key];
            var req = false;
            if (schema.required) {
              req = schema.required.indexOf(_key) >= 0 ? true : false;
            }
            var childObj = {};
            childObj = this.schema2obj(entity, _key, req, false, modelObjs, parent + parentDelim + key.replace('##ROOT##', 'data'));
            obj._properties.push(childObj);
          })
          break;
        case 'OneOf':
        case 'AnyOf':
        case 'AllOf':
          newModel = { ...this.deepCopy(this.newXOf(type, key, null, parent)) };
          if (obj && obj._type && obj._type.length > 0) {
            obj._type.push(newModel._type[0]);
            this.copyProps(obj, newModel);
          } else {
            obj = newModel;
          }
          if (schema.description) {
            obj._description = schema.description;
          }
          if (schema.oneOf || schema.anyOf || schema.allOf) {
            var fld = type[0].toLowerCase() + type.slice(1);
            schema[fld].forEach((item, i) => {
              var res = this.schema2obj(item, 'xOf', false, false, modelObjs, parent + parentDelim + key.replace('##ROOT##', 'data'));
              res._hideKey = true;
              obj._properties.push(res);
            })
          }
          break
        case 'array':
          newModel = { ...this.newArray(key, parent) };
          if (obj && obj._type && obj._type.length > 0) {
            obj._type.push(newModel._type[0]);
            this.copyProps(obj, newModel);
          } else {
            obj = newModel;
          }

          if (schema.description) {
            obj._description = schema.description;
          }
          if (schema.default) {
            obj._default = schema.default;
          }
          if (schema.hasOwnProperty('uniqueItems')) {
            obj._uniqueItems = obj.uniqueItems;
          }
          if (schema.hasOwnProperty('minItems')) {
            obj._minItems = schema.minItems;
          }
          if (schema.hasOwnProperty('maxItems')) {
            obj._maxItems = schema.maxItems;
          }

          if (schema.items) {
            obj._items = [];
            var req = false;
            if (schema.required) {
              req = schema.required.indexOf(key) >= 0 ? true : false;
            }
            obj._items.push(this.schema2obj(schema.items, '', req, false, modelObjs, parent + parentDelim + key.replace('##ROOT##', 'data') + '[0]'));
          }
          break;
        case 'string':
          newModel = { ...this.newString(key, false, parent) };
          if (obj && obj._type && obj._type.length > 0) {
            obj._type.push(newModel._type[0]);
            this.copyProps(obj, newModel);
          } else {
            obj = newModel;
          }
          if (schema.description) {
            obj._description = schema.description;
          }
          if (schema.minLength >= 0) {
            obj._minLength = schema.minLength;
          }
          if (schema.maxLength >= 0) {
            obj._maxLength = schema.maxLength;
          }
          if (schema.pattern) {
            obj._pattern = schema.pattern;
          }
          if (schema.format) {
            obj._format = schema.format;
          }
          if (schema.default) {
            obj._default = schema.default;
          }
          if (schema.hasOwnProperty('enum')) {
            obj._enum = schema.enum;
          }
          break;
        case 'integer':
        case 'number':
          if (type === 'integer') {
            newModel = { ...this.newInteger(key, parent) };
          } else {
            newModel = { ...this.newNumber(key, parent) };
          }
          if (obj && obj._type && obj._type.length > 0) {
            obj._type.push(newModel._type[0]);
            this.copyProps(obj, newModel);
          } else {
            obj = newModel;
          }

          if (schema.description) {
            obj._description = schema.description;
          }
          if (schema.default) {
            obj._default = schema.default;
          }
          if (schema.minimum >= 0) {
            obj._minimum = schema.minimum;
          }
          if (schema.maximum >= 0) {
            obj._maximum = schema.maximum;
          }
          if (schema.exclusiveMinimum) {
            obj._exclusiveMinimum = schema.exclusiveMinimum;
          }
          if (schema.exclusiveMaximum) {
            obj._exclusiveMaximum = schema.exclusiveMaximum;
          }
          if (schema.multipleOf >= 0) {
            obj._multipleOf = schema.multipleOf;
          }
          if (schema.format) {
            obj._format = schema.format;
          }
          if (schema.hasOwnProperty('enum') && schema.enum.length > 0) {
            var _enum = JSON.stringify(schema.enum);
            _enum = _enum.substr(1, _enum.length - 2);
            _enum = _enum.replace(/,/g, ',\n');
            obj._enum = _enum;
          }
          break;
        case 'boolean':
          newModel = { ...this.newBoolean(key, parent) };
          if (obj && obj._type && obj._type.length > 0) {
            obj._type.push(newModel._type[0]);
            this.copyProps(obj, newModel);
          } else {
            obj = newModel;
          }
          if (schema.description) {
            obj._description = schema.description;
          }
          if (schema.default) {
            obj._default = schema.default;
          }
          break;
        case 'null':
          newModel = { ...this.newNull(key, parent) };
          if (obj && obj._type && obj._type.length > 0) {
            obj._type.push(newModel._type[0]);
            this.copyProps(obj, newModel);
          } else {
            obj = newModel;
          }
          //schema.type = 'null';
          if (schema.description) {
            obj._description = schema.description;
          }
          if (schema.default) {
            obj._default = schema.default;
          }
          break;
      }
      if (!type && schema.$ref) {
        var value = schema.$ref.substring(schema.$ref.indexOf('/', 2) + 1, schema.$ref.length); //find second /, #/definitions/ or #/responses/ etc
        var path = schema.$ref.substring(0, schema.$ref.indexOf('/', 2) + 1)
        var modelKey = '';
        if (modelObjs) {
          Object.keys(modelObjs).forEach(_key => {
            let model = modelObjs[_key]
            if (model.nameSpace === value) {
              // @ts-ignore
              modelKey = _key;
            }
          })
        }

        obj = this.new$ref(key, modelKey || value, parent, path);
      }
    }

    obj._required = required;
    if (isRoot) {
      obj.root$$ = true;
    }
    return obj;
  }

  static sanitizeModel(model) {
    if (model.type instanceof Array && model.type.length === 1) {
      model.type = model.type[0];
    }
    if (model.properties) {
      Object.keys(model.properties).forEach(key => {
        let value = model.properties[key];
        model.properties[key] = JsonSchemaService.sanitizeModel(value);
      })
    }
    return model;
  }

  getModeldefinitions(models) {
    const modelRefs = {};
    for (const key in models) {
      if (!key) {
        continue;
      }
      const model = models[key];
      modelRefs[model.nameSpace] = model.data;
    };
    return modelRefs;
  }

  static schemaToExample(schema, obj: any, config: any = {}) {
    if (schema == null) {
      return;
    }
    if (schema.type === "object" || schema.properties) {
      for (let key in schema.properties) {
        if (schema.properties[key].deprecated) {
          continue;
        }
        if (schema.properties[key].readonly && config.includeReadOnly) {
          continue;
        }
        if (schema.properties[key].writeOnly && !config.includeWriteOnly) {
          continue;
        }

        //let temp = Object.assign({}, schema.properties [key] );
        obj[key] = JsonSchemaService.schemaToExample(schema.properties[key], {}, config);
      }
    }
    else if (schema.type === "array" || schema.items) {
      //let temp = Object.assign(), schema.items );
      obj[JsonSchemaService.schemaToExample(schema.items, {}, config)]
    }
    else if (schema.allOf) {
      if (schema.allOf.length === 1) {
        if (!schema.allOf[0]) {
          return "string";
        } else {
          return JsonSchemaService.getSampleValueByType(schema.allOf[0])
        }
      }
      let objWithAllProps = {};
      schema.allOf.map(function (v) {
        if (v && v.type) {
          let partialObj = JsonSchemaService.schemaToExample(v, {}, config);
          Object.assign(objWithAllProps, partialObj);
        }
      });
      obj = objWithAllProps;
    }
    else {
      return JsonSchemaService.getSampleValueByType(schema);
    }
    return obj;
  }

  static getSampleValueByType(schemaObj) {
    if (schemaObj.example) {
      return schemaObj.example;
    }

    if (Object.keys(schemaObj).length === 0) {
      return null;
    }

    const typeValue = schemaObj.format || schemaObj.type || (schemaObj.enum ? 'enum' : null);
    switch (typeValue) {
      case 'int32':
      case 'int64':
      case 'integer':
        return 0;
      case 'float':
      case 'double':
      case 'number':
        return 0.5;
      case 'string':
        return (schemaObj.enum ? schemaObj.enum[0] : (schemaObj.pattern ? schemaObj.pattern : "string"));
      case 'byte':
        return btoa('string');
      case 'binary':
        return 'binary';
      case 'boolean':
        return false;
      case 'date':
        return (new Date(0)).toISOString().split('T')[0];
      case 'date-time':
        return (new Date(0)).toISOString();
      case 'dateTime':
        return (new Date(0)).toISOString();
      case 'password':
        return 'password';
      case 'enum':
        return schemaObj.enum[0];
      case 'uri':
        return 'http://example.com';
      case 'uuid':
        return '3fa85f64-5717-4562-b3fc-2c963f66afa6';
      case 'email':
        return 'user@example.com';
      case 'hostname':
        return 'example.com';
      case 'ipv4':
        return '198.51.100.42';
      case 'ipv6':
        return '2001:0db8:5b96:0000:0000:426f:8e17:642a';
      case 'circular':
        return 'CIRCULAR REF';
      default:
        if (schemaObj.nullable) {
          return null;
        }
        else {
          console.warn('Unknown schema value', schemaObj); return '?';
        }
    }
  }

  static getEmptySchema(): { type: 'object', properties?: { [key: string]: any }, required: string[] } {
    return {
      type: 'object',
      properties: {},
      required: []
    }
  }
}
