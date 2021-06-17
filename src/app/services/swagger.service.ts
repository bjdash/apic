import { ApiProject, SecurityDef } from './../models/ApiProject.model';
import { Injectable } from "@angular/core";
import apic from '../utils/apic';
import { JsonSchemaService } from '../components/common/json-schema-builder/jsonschema.service';
import { Utils } from './utils.service';

@Injectable()
export class SwaggerService {
    constructor() {

    }

    importOAS2(spec, optn) {
        if (!spec.swagger) {
            return;
        }
        if (!optn)
            optn = {};
        var proj: ApiProject = {
            title: '',
            description: '',
            version: '',
            termsOfService: ''
        };

        if (spec.info) {
            proj.title = spec.info.title ? spec.info.title : '';
            proj.description = spec.info.description ? spec.info.description : '';
            proj.version = spec.info.version ? spec.info.version : '';
            proj.termsOfService = spec.info.termsOfService ? spec.info.termsOfService : '';

            if (spec.info.contact) {
                proj.contact = {};
                proj.contact.name = spec.info.contact.name ? spec.info.contact.name : '';
                proj.contact.url = spec.info.contact.url ? spec.info.contact.url : '';
                proj.contact.email = spec.info.contact.email ? spec.info.contact.email : '';
            }

            if (spec.info.license) {
                proj.license = {};
                proj.license.name = spec.info.license.name ? spec.info.license.name : '';
                proj.license.url = spec.info.license.url ? spec.info.license.url : '';
            }
        }

        //importing host, basePath etc and creating env from it
        proj.setting = {};
        proj.setting.basePath = spec.basePath ? spec.basePath : '';
        proj.setting.host = spec.host ? spec.host : '';
        proj.setting.protocol = spec.schemes && spec.schemes.length > 0 ? spec.schemes[0] : 'http';

        proj.models = {};
        proj.folders = {};
        proj.traits = {};
        proj.endpoints = {};

        //importing securityDefinitions
        proj.securityDefinitions = [];
        if (spec.securityDefinitions) {
            for (const [name, def] of Utils.objectEntries(spec.securityDefinitions)) {
                var secdef: SecurityDef = {
                    name: name,
                    type: def.type,
                    description: def.description,
                    xProperty: []
                }
                //import x-properties
                Utils.objectKeys(def).forEach(function (key) {
                    if (key.startsWith('x-')) {
                        secdef.xProperty.push({
                            key: key,
                            val: def[key]
                        })
                    }
                })
                switch (def.type) {
                    case 'apiKey':
                        secdef.apiKey = {
                            in: def.in,
                            name: def.name
                        }
                        break;
                    case 'oauth2':
                        secdef.oauth2 = {
                            flow: def.flow,
                            // authorizationUrl: def.authorizationUrl,
                            scopes: []
                        }
                        if (def.flow == 'implicit' || def.flow == 'accessCode') {
                            secdef.oauth2.authorizationUrl = def.authorizationUrl;
                        }
                        if (['password', 'application', 'accessCode'].includes(def.flow)) {
                            secdef.oauth2.tokenUrl = def.tokenUrl;
                        }
                        for (const [scope, desc] of Utils.objectEntries(def.scopes)) {
                            secdef.oauth2.scopes.push({ key: scope, val: desc });
                        }
                        if (secdef.oauth2.scopes.length === 0) {
                            secdef.oauth2.scopes.push({ key: '', val: '' });
                        }
                        break;
                }
                proj.securityDefinitions.push(secdef);
            }
        }

        //Parsing Model
        if (spec.definitions) {
            //create a folder called models to hold models
            var modelFolder = {
                _id: apic.s12(),
                name: 'Models',
                desc: 'This folder will contain all the models.'
            };
            proj.folders[modelFolder._id] = modelFolder;

            for (const [name, model] of Utils.objectEntries(spec.definitions)) {
                var id = apic.s12(), newModel: any = {};
                newModel._id = id;
                newModel.name = name;
                newModel.nameSpace = name;
                //add type if missing
                if (!model.type) {
                    if (model.properties) model.type = 'object';
                    else if (model.items) model.type = 'array';
                    else if (model.$ref) delete model.type;
                    else model.type = 'string';
                }
                newModel.data = JsonSchemaService.sanitizeModel(model);
                newModel.folder = modelFolder._id;

                proj.models[newModel._id] = newModel;
            };
        }

        //reading parameters (add in trait)
        if (spec.parameters) {
            for (const [name, param] of Utils.objectEntries(spec.parameters)) {
                let traitName = '';
                if (name.indexOf('trait') === 0 && (name.match(/:/g) || []).length === 2) {
                    traitName = name.split(':')[1];
                } else {
                    traitName = name;
                }
                //check if trait is already there
                var tmpTrait;
                for (const [id, trait] of Utils.objectEntries(proj.traits)) {
                    if (trait.name === traitName) {
                        tmpTrait = trait;
                    }
                };

                //if trait is not there create one
                if (!tmpTrait) {
                    tmpTrait = {
                        _id: apic.s12(),
                        name: traitName,
                        queryParams: {
                            type: ["object"],
                            properties: {},
                            required: []
                        },
                        headers: {
                            type: ["object"],
                            properties: {},
                            required: []
                        },
                        pathParams: {
                            type: ["object"],
                            properties: {},
                            required: []
                        },
                        responses: []
                    };
                    proj.traits[tmpTrait._id] = tmpTrait;
                }

                var type;
                switch (param.in) {
                    case 'header':
                        type = 'headers';
                        break;
                    case 'query':
                        type = 'queryParams';
                        break;
                    case 'path':
                        type = 'pathParams';
                        break;
                    default:
                        console.error(param.in + ' is not yet supported in params (trait).');
                }
                if (['header', 'query', 'path'].indexOf(param.in) >= 0) {
                    tmpTrait[type].properties[param.name] = {
                        type: param.type,
                        default: param.default ? param.default : '',
                        description: param.description ? param.description : ''
                    };
                    if (param.items) {
                        tmpTrait[type].properties[param.name].items = param.items;
                    }
                    if (param.required) {
                        tmpTrait[type].required.push(param.name);
                    }
                } else {
                    //TODO: Add support for other params
                    //console.error(param.in + ' is not yet supported');
                }
            };
        }//if(spec.parameters)


        if (spec.responses) {
            for (const [name, resp] of Utils.objectEntries(spec.responses)) {
                let traitName = '', code = name, noneStatus;
                if (name.indexOf('trait') === 0 && name.indexOf(':') > 0) {
                    traitName = name.split(':')[1];
                    code = name.split(':')[2];
                    if (!/^\d+$/.test(code)) {
                        noneStatus = true;
                    }
                } else {
                    traitName = name;
                    noneStatus = true;
                }
                //check if trait is already there
                var tmpTrait;
                for (const [id, trait] of Utils.objectEntries(proj.traits)) {
                    if (trait.name === traitName) {
                        tmpTrait = trait;
                    }
                };

                //if trait is not there create one
                if (!tmpTrait) {
                    tmpTrait = {
                        _id: apic.s12(),
                        name: traitName,
                        queryParams: {
                            type: ['object'],
                            properties: {},
                            required: []
                        },
                        headers: {
                            type: ['object'],
                            properties: {},
                            required: []
                        },
                        pathParams: {
                            type: ['object'],
                            properties: {},
                            required: []
                        },
                        responses: []
                    };
                    proj.traits[tmpTrait._id] = tmpTrait;
                }

                //resp ->description, schema
                let tmpResp = {
                    code: code,
                    data: resp.schema,
                    desc: resp.description,
                    noneStatus: noneStatus
                };
                tmpTrait.responses.push(tmpResp);

            };
        }

        //parsing endpoints
        if (spec.paths) {
            var folders = {};
            for (const [pathName, apis] of Utils.objectEntries(spec.paths)) {
                var fname = '';
                if (optn.groupby === 'path') {
                    fname = pathName.substring(1, pathName.length);
                    fname = fname.substring(0, fname.indexOf('/') > 0 ? fname.indexOf('/') : fname.length);
                }
                var folderId;
                if (fname) {
                    if (!folders[fname]) {
                        let pathFolder = {
                            _id: apic.s12(),
                            name: fname,
                            desc: 'This folder contains the requests for endpoint ' + pathName
                        };
                        proj.folders[pathFolder._id] = pathFolder;
                        folders[fname] = folderId = pathFolder._id;
                    } else {
                        folderId = folders[fname];
                    }
                }

                for (const [method, path] of Utils.objectEntries(apis)) {
                    if (optn.groupby === 'tag') {
                        let fname = 'Untagged';
                        if (path.tags && path.tags[0]) {
                            fname = path.tags[0];
                        }
                        if (!folders[fname]) {
                            let pathFolder = {
                                _id: apic.s12(),
                                name: fname,
                                desc: 'This folder contains the requests for endpoint ' + pathName
                            };
                            proj.folders[pathFolder._id] = pathFolder;
                            folders[fname] = folderId = pathFolder._id;
                        } else {
                            folderId = folders[fname];
                        }
                    }
                    if (['get', 'post', 'put', 'delete', 'options', 'head', 'patch'].indexOf(method) >= 0) {
                        var tmpEndP: any = {
                            _id: apic.s12(),
                            headers: {
                                type: ['object'],
                                properties: {},
                                required: []
                            },
                            queryParams: {
                                type: ['object'],
                                properties: {},
                                required: []
                            },
                            pathParams: {
                                type: ['object'],
                                properties: {},
                                required: []
                            },
                            body: {
                                type: '',
                                data: []
                            },
                            traits: [],
                            responses: [],
                            folder: folderId
                        };
                        tmpEndP.path = pathName;
                        tmpEndP.method = method;
                        tmpEndP.tags = path.tags || [];
                        tmpEndP.summary = path.summary || pathName;
                        tmpEndP.description = path.description || '';
                        tmpEndP.description = path.description || '';
                        tmpEndP.operationId = path.operationId || '';
                        tmpEndP.consumes = path.consumes || [];
                        tmpEndP.produces = path.produces || [];
                        tmpEndP.schemes = path.schemes ? path.schemes.map(function (s) {
                            return { key: s.toLowerCase(), val: s };
                        }) : [];

                        if (path.parameters) {
                            for (var i = 0; i < path.parameters.length; i++) {
                                var param = path.parameters[i];
                                var ptype = undefined;
                                switch (param.in) {
                                    case 'header':
                                        ptype = 'headers';
                                        break;
                                    case 'query':
                                        ptype = 'queryParams';
                                        break;
                                    case 'path':
                                        ptype = 'pathParams';
                                        break;
                                    case 'body':
                                        ptype = 'body';
                                        break;
                                    case 'formData':
                                        ptype = 'formData';
                                        break;
                                    default:
                                        if (!param.$ref) {
                                            console.error('not supported', param);
                                        }
                                }
                                if (['headers', 'queryParams', 'pathParams'].indexOf(ptype) >= 0) {
                                    tmpEndP[ptype].properties[param.name] = {
                                        type: param.type,
                                        default: param.default ? param.default : '',
                                        description: param.description ? param.description : ''
                                    };
                                    if (param.items) {
                                        tmpEndP[ptype].properties[param.name].items = param.items;
                                    }
                                    if (param.required) {
                                        tmpEndP[ptype].required.push(param.name);
                                    }
                                } else if (ptype === 'body') {
                                    tmpEndP.body = {
                                        type: 'raw',
                                        data: Object.assign({}, param.schema)
                                    };
                                } else if (ptype === 'formData') {
                                    tmpEndP.body.type = 'x-www-form-urlencoded';
                                    if (tmpEndP.body.data.length === undefined)
                                        tmpEndP.body.data = [];
                                    tmpEndP.body.data.push({
                                        key: param.name,
                                        type: param.type,
                                        desc: param.description,
                                        required: param.required
                                    });
                                    if (param.type === 'file') {
                                        tmpEndP.body.type = 'form-data';
                                    }
                                } else if (param.$ref) {
                                    var ref = param.$ref;
                                    let traitName = ref.substring(ref.lastIndexOf('/') + 1, ref.length);
                                    if (traitName.indexOf('trait') === 0 && (traitName.match(/:/g) || []).length === 2) {
                                        traitName = ref.split(':')[1];
                                    }
                                    var trait = this.getTraitByName(proj, traitName);
                                    if (trait) {//if trait not added then push it
                                        var existing = false;
                                        for (var j = 0; j < tmpEndP.traits.length; j++) {
                                            if (tmpEndP.traits[j]._id === trait._id) {
                                                existing = true;
                                                break;
                                            }
                                        }
                                        if (!existing) {
                                            tmpEndP.traits.push(trait);
                                        }
                                    } else {
                                        console.error('unresolved $ref: ' + ref);
                                    }
                                }
                            }
                        }

                        if (path.responses) {
                            for (const [statusCode, resp] of Utils.objectEntries(path.responses)) {
                                var moveRespToTrait = false, refName;
                                if (resp.$ref) {
                                    var ref = resp.$ref;
                                    var traitName = ref.substring(ref.lastIndexOf('/') + 1, ref.length);
                                    refName = traitName;
                                    if (traitName.indexOf('trait') === 0 && (traitName.match(/:/g) || []).length === 2) {
                                        var refSplit = ref.split(':');
                                        traitName = refSplit[1];
                                        if (parseInt(refSplit[2]) == refSplit[2]) {
                                            moveRespToTrait = true;
                                        }
                                        refName = refSplit[2];
                                    }
                                    if (moveRespToTrait) {
                                        var trait = this.getTraitByName(proj, traitName);
                                        if (trait) {//if trait not added then push it
                                            var existing = false;
                                            for (var j = 0; j < tmpEndP.traits.length; j++) {
                                                if (tmpEndP.traits[j]._id === trait._id) {
                                                    existing = true;
                                                    break;
                                                }
                                            }
                                            if (!existing) {
                                                tmpEndP.traits.push(trait);
                                            }
                                        } else {
                                            console.error('unresolved $ref: ' + ref);
                                        }
                                    }
                                }
                                if (!resp.$ref || !moveRespToTrait) {
                                    let tmpResp = {
                                        data: resp.$ref ? ({ $ref: resp.$ref.substring(0, resp.$ref.lastIndexOf('/') + 1) + refName }) : (resp.schema || { type: 'object' }),
                                        desc: resp.description,
                                        code: statusCode
                                    };
                                    tmpEndP.responses.push(tmpResp);
                                }
                            };
                        }

                        if (path.security) {
                            tmpEndP.security = [];
                            path.security.forEach(function (sec) {
                                tmpEndP.security.push({ name: Object.keys(sec)[0] });
                            })
                        }
                        proj.endpoints[tmpEndP._id] = tmpEndP;
                    }



                };
            };
        }
        return proj;
    }

    exportOAS(proj, type) {
        proj = Utils.clone(proj);
        var obj: any = {};
        obj.swagger = '2.0';
        obj.info = {
            title: proj.title,
            description: proj.description,
            version: proj.version,
            termsOfService: proj.termsOfService
        };

        if (proj.contact) {
            obj.info.contact = {
                name: proj.contact.name,
                url: proj.contact.url,
                email: proj.contact.email
            };
        }

        if (proj.license) {
            obj.info.license = {
                name: proj.license.name,
                url: proj.license.url
            };
        }

        if (proj.setting) {
            if (proj.setting.basePath) {
                obj.basePath = proj.setting.basePath;
            }
            if (proj.setting.host) {
                obj.host = proj.setting.host;
            }
            if (proj.setting.protocol) {
                obj.schemes = [proj.setting.protocol];
            }
        }

        if (proj.securityDefinitions && proj.securityDefinitions.length > 0) {
            var secDefs = {};
            proj.securityDefinitions.forEach(function (def) {
                var defObj: any = {
                    type: def.type,
                    description: def.description || ''
                }
                //process x-properties

                def.xProperty?.forEach(function (prop) {
                    if (prop.key?.startsWith('x-')) {
                        defObj[prop.key] = prop.val
                    }
                })

                switch (def.type) {
                    case 'apiKey':
                        defObj.in = def.apiKey.in;
                        defObj.name = def.apiKey.name;
                        break;
                    case 'oauth2':
                        defObj.flow = def.oauth2.flow;
                        if (def.oauth2.flow == 'implicit' || def.oauth2.flow == 'accessCode') {
                            defObj.authorizationUrl = def.oauth2.authorizationUrl;
                        }
                        if (['password', 'application', 'accessCode'].includes(def.oauth2.flow)) {
                            defObj.tokenUrl = def.oauth2.tokenUrl;
                        }
                        defObj.scopes = {};
                        if (def.oauth2.scopes.length > 0) {
                            def.oauth2.scopes.forEach(function (s) {
                                defObj.scopes[s.key] = s.val;
                            })
                        }
                        break;
                }
                secDefs[def.name] = defObj;
            })
            obj.securityDefinitions = secDefs;
        }

        obj.definitions = {};
        //add definitions/models
        for (const [id, model] of Utils.objectEntries(proj.models)) {
            // angular.forEach(proj.models, function (model) {
            model.data = JsonSchemaService.sanitizeModel(model.data);
            obj.definitions[model.nameSpace] = model.data;
        };

        obj.responses = {};
        obj.parameters = {};
        //adding responses and parameters from traits
        for (const [id, trait] of Utils.objectEntries(proj.traits)) {
            // angular.forEach(proj.traits, function (trait) {
            var responses = trait.responses;
            var tName = trait.name.replace(/\s/g, ' ');

            for (var i = 0; i < responses.length; i++) {
                //var schema = JsonSchema.obj2schema(responses[i].data, proj.models);
                var schema = responses[i].data;
                var name = 'trait:' + tName + ':' + responses[i].code;
                obj.responses[name] = {
                    schema: schema,
                    description: responses[i].desc ? responses[i].desc : ''
                };
            }

            if (trait.pathParams) {
                for (const [key, schema] of Utils.objectEntries(trait.pathParams.properties)) {
                    // angular.forEach(trait.pathParams.properties, function (schema, key) {
                    let param = {
                        name: key,
                        in: 'path',
                        description: schema.description ? schema.description : '',
                        required: trait.pathParams.required && trait.pathParams.required.indexOf(key) >= 0 ? true : false
                    };
                    //var paramExtra = getParam(schema);
                    param = Object.assign(param, schema);
                    var name = 'trait:' + tName + ':' + key;
                    obj.parameters[name] = param;
                };
            }

            for (const [key, schema] of Utils.objectEntries(trait.queryParams.properties)) {
                // angular.forEach(trait.queryParams.properties, function (schema, key) {
                let param = {
                    name: key,
                    in: 'query',
                    description: schema.description ? schema.description : '',
                    required: trait.queryParams.required && trait.queryParams.required.indexOf(key) >= 0 ? true : false
                };
                //var paramExtra = getParam(schema);
                param = Object.assign(param, schema);
                var name = 'trait:' + tName + ':' + key;
                obj.parameters[name] = param;
            };

            for (const [key, schema] of Utils.objectEntries(trait.headers.properties)) {
                // angular.forEach(trait.headers.properties, function (schema, key) {
                let param = {
                    name: key,
                    in: 'header',
                    description: schema.description ? schema.description : '',
                    required: trait.headers.required && trait.headers.required.indexOf(key) >= 0 ? true : false
                };
                param = Object.assign(param, schema);
                var name = 'trait:' + tName + ':' + key;
                obj.parameters[name] = param;
            };
        };


        obj.paths = {};
        //add paths
        for (const [id, endp] of Utils.objectEntries(proj.endpoints)) {
            // angular.forEach(proj.endpoints, function (endp) {
            if (obj.paths[endp.path] === undefined) {
                obj.paths[endp.path] = {};
            }
            if (obj.paths[endp.path][endp.method] === undefined) {
                obj.paths[endp.path][endp.method] = {};
            }
            let reqObj: any = {
                tags: endp.tags,
                summary: endp.summary,
                description: endp.description,
                //operationId: endp.operationId,
                consumes: endp.consumes,
                produces: endp.produces,
                schemes: [],
            };
            if (endp.security) {
                reqObj.security = [];
                endp.security.forEach(function (sec) {
                    var secObj = {};
                    secObj[sec.name] = [];
                    reqObj.security.push(secObj);
                });
            }
            if (endp.operationId) {
                reqObj.operationId = endp.operationId;
            }
            for (var i = 0; i < endp.schemes.length; i++) {
                reqObj.schemes.push(endp.schemes[i].key);
            }
            reqObj.responses = {};
            for (var j = 0; j < endp.responses.length; j++) {
                let code = endp.responses[j].code;
                reqObj.responses[code] = {};
                //var schema = JsonSchema.obj2schema(endp.responses[j].data, proj.models);
                var schema = endp.responses[j].data;
                reqObj.responses[code].schema = schema;
                //TODO: Add description
                reqObj.responses[code].description = endp.responses[j].desc ? endp.responses[j].desc : '';
            }

            reqObj.parameters = [];
            //add query parameters
            for (const [key, schema] of Utils.objectEntries(endp.queryParams.properties)) {
                // angular.forEach(endp.queryParams.properties, function (schema, key) {
                let param = {
                    name: key,
                    in: 'query',
                    description: schema.description ? schema.description : '',
                    required: endp.queryParams.required && endp.queryParams.required.indexOf(key) >= 0 ? true : false
                };
                //var paramExtra = getParam(schema);
                param = Object.assign(param, schema);
                reqObj.parameters.push(param);
            };

            for (const [key, schema] of Utils.objectEntries(endp.headers.properties)) {
                // angular.forEach(endp.headers.properties, function (schema, key) {
                let param = {
                    name: key,
                    in: 'header',
                    description: schema.description ? schema.description : '',
                    required: endp.headers.required && endp.headers.required.indexOf(key) >= 0 ? true : false
                };
                //var paramExtra = getParam(schema);
                param = Object.assign(param, schema);
                reqObj.parameters.push(param);
            };

            for (const [key, schema] of Utils.objectEntries(endp.pathParams.properties)) {
                // angular.forEach(endp.pathParams.properties, function (schema, key) {
                let param = {
                    name: key,
                    in: 'path',
                    description: schema.description ? schema.description : '',
                    required: endp.pathParams.required && endp.pathParams.required.indexOf(key) >= 0 ? true : false
                };
                //var paramExtra = getParam(schema);
                param = Object.assign(param, schema);
                reqObj.parameters.push(param);
            };

            if (endp.body) { //if the trait has body add body params
                switch (endp.body.type) {
                    case 'raw':
                        let param = {
                            name: 'body',
                            in: 'body',
                            schema: endp.body.data
                            //description: schema.description ? schema.description : '',
                            //required: endp.body.data[x].required ? true : false
                        };
                        reqObj.parameters.push(param);
                        break;
                    case 'form-data':
                    case 'x-www-form-urlencoded':
                        for (var x = 0; x < endp.body.data.length; x++) {
                            let param: any = {
                                name: endp.body.data[x].key,
                                in: 'formData',
                                type: endp.body.data[x].type,
                                description: endp.body.data[x].desc ? endp.body.data[x].desc : '',
                                required: endp.body.data[x].required ? true : false
                            };
                            if (param.type === 'array') {
                                param.items = {
                                    type: 'string'
                                };
                            }
                            reqObj.parameters.push(param);
                        }
                        break;
                }
            }

            //importing details from traits
            for (var j = 0; j < endp.traits.length; j++) {
                var traitObj = proj.traits[endp.traits[j]._id];
                var tName = traitObj.name;
                //responses
                for (var i = 0; i < traitObj.responses.length; i++) {
                    var xPath = 'trait:' + tName + ':' + traitObj.responses[i].code;
                    if (obj.responses[xPath] && !traitObj.responses[i].noneStatus) {
                        let schema = {
                            '$ref': '#/responses/' + xPath
                        };
                        reqObj.responses[traitObj.responses[i].code] = schema;
                    }
                }

                if (traitObj.pathParams) {
                    for (const [key, schema] of Utils.objectEntries(traitObj.pathParams.properties)) {
                        // angular.forEach(traitObj.pathParams.properties, function (schema, key) {
                        var xPath = 'trait:' + tName + ':' + key;
                        if (obj.parameters[xPath]) {
                            reqObj.parameters.push({
                                '$ref': '#/parameters/' + xPath
                            });
                        } else {
                            console.error('Used path "' + xPath + '" not found in responses (from traits).');
                        }
                    };
                }

                for (const [key, schema] of Utils.objectEntries(traitObj.queryParams.properties)) {
                    // angular.forEach(traitObj.queryParams.properties, function (schema, key) {
                    var xPath = 'trait:' + tName + ':' + key;
                    if (obj.parameters[xPath]) {
                        reqObj.parameters.push({
                            '$ref': '#/parameters/' + xPath
                        });
                    } else {
                        console.error('Used path "' + xPath + '" not found in responses (from traits).');
                    }
                };

                //query params
                for (const [key, schema] of Utils.objectEntries(traitObj.headers.properties)) {
                    // angular.forEach(traitObj.headers.properties, function (schema, key) {
                    var xPath = 'trait:' + tName + ':' + key;
                    if (obj.parameters[xPath]) {
                        reqObj.parameters.push({
                            '$ref': '#/parameters/' + xPath
                        });
                    } else {
                        console.error('Used path "' + xPath + '" not found in responses (from traits).');
                    }
                };

                //header params
            }

            obj.paths[endp.path][endp.method] = reqObj;
        };

        if (type === 'string') {
            return JSON.stringify(obj, null, '    ');
        }
        return obj;
    }

    exportRAW(proj, type) {
        delete proj.owner;
        delete proj.team;
        delete proj.simKey;
        var rawProj = {
            TYPE: 'APIC Api Project',
            value: proj
        };
        if (type === 'string') {
            try {
                return JSON.stringify(rawProj, null, '    ');
            } catch (e) {
                return 'Failed to export project';
            }
        }
        return rawProj;
    }



    private getTraitByName(proj, tName) {
        if (!proj || !proj.traits) {
            return;
        }
        var match;
        for (const [id, trait] of Utils.objectEntries(proj.traits)) {
            if (trait.name === tName) {
                match = {
                    _id: trait._id,
                    name: trait.name
                };
            }
        };
        return match;
    }
}