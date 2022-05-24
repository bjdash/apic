import { ApiProject, ApiTag, SecurityDef } from './../models/ApiProject.model';
import { Injectable } from "@angular/core";
import apic from '../utils/apic';
import { JsonSchemaService } from '../components/common/json-schema-builder/jsonschema.service';
import { Utils } from './utils.service';
import { METHOD_WITH_BODY } from '../utils/constants';
import { OpenAPIV2, OpenAPIV3_1 } from 'openapi-types';
import { OAS3Utils } from '../utils/OAS3.utils';
export interface SwaggerOption {
    includeApicIds?: boolean
}

@Injectable()
export class SwaggerService {
    constructor() {

    }

    importOAS2(spec: OpenAPIV2.Document, optn) {
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
                            secdef.oauth2.tokenUrl = (def as (OpenAPIV2.SecuritySchemeOauth2AccessCode | OpenAPIV2.SecuritySchemeOauth2Password | OpenAPIV2.SecuritySchemeOauth2Application)).tokenUrl;
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

        //import tags
        proj.tags = [];
        if (spec.tags?.length > 0) {
            proj.tags = spec.tags.map(specTag => {
                let tag: ApiTag = {
                    name: specTag.name,
                    description: specTag.description,
                    // xProperty: [{key:'', val:''}]
                }
                if (specTag.externalDocs) {
                    tag.externalDocs = specTag.externalDocs
                }
                tag.xProperty = Object.keys(specTag).filter(key => key.startsWith('x-')).map(key => {
                    return { key, val: specTag[key] }
                })
                return tag;
            });
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
                if (name.indexOf('trait') === 0 && (name.match(/\./g) || []).length === 2) {
                    traitName = name.split('.')[1];
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
                if (name.indexOf('trait') === 0 && name.indexOf('.') > 0) {
                    traitName = name.split('.')[1];
                    code = name.split('.')[2];
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

                for (const [method, path] of Utils.objectEntries(apis as { [key: string]: OpenAPIV2.OperationObject })) {
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

                        tmpEndP.deprecated = !!path.deprecated;

                        if (path.parameters) {
                            for (var i = 0; i < path.parameters.length; i++) {
                                var param = path.parameters[i];
                                var ptype = undefined;
                                if ('in' in param) {
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
                                    }
                                } else if (param.$ref) {
                                    let ref = param.$ref;
                                    let traitName = ref.substring(ref.lastIndexOf('/') + 1, ref.length);
                                    if (traitName.indexOf('trait') === 0 && (traitName.match(/\./g) || []).length === 2) {
                                        traitName = ref.split('.')[1];
                                    }
                                    let trait = this.getTraitByName(proj, traitName);
                                    if (trait) {//if trait not added then push it
                                        let existing = false;
                                        for (let j = 0; j < tmpEndP.traits.length; j++) {
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
                                let moveRespToTrait = false, refName;
                                if ('$ref' in resp) {
                                    let ref = resp.$ref;
                                    let traitName = ref.substring(ref.lastIndexOf('/') + 1, ref.length);
                                    refName = traitName;
                                    if (traitName.indexOf('trait') === 0 && (traitName.match(/\./g) || []).length === 2) {
                                        let refSplit = ref.split('.');
                                        traitName = refSplit[1];
                                        if (refSplit[2]?.match(/^\d+$/)) {
                                            moveRespToTrait = true;
                                        }
                                        refName = refSplit[2];
                                    }
                                    if (moveRespToTrait) {
                                        let trait = this.getTraitByName(proj, traitName);
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
                                if (!('$ref' in resp) || !moveRespToTrait) {
                                    let tmpResp = {
                                        data: ('$ref' in resp) ? ({ $ref: resp.$ref.substring(0, resp.$ref.lastIndexOf('/') + 1) + refName }) : (resp.schema || { type: 'object' }),
                                        desc: ('description' in resp) ? resp.description : '',
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

    exportOAS(proj: ApiProject, options?: SwaggerOption): OpenAPIV2.Document {
        proj = Utils.clone(proj);
        var obj: OpenAPIV2.Document = {
            swagger: '2.0',
            info: OAS3Utils.getInfo(proj),
            ...(proj.setting?.basePath && { basePath: proj.setting.basePath }),
            ...(proj.setting?.host && { host: proj.setting.host }),
            ... (proj.setting?.protocol && { schemes: [proj.setting.protocol] }),
            securityDefinitions: OAS3Utils.getSecuritySchemes(proj, "OAS2"),
            tags: OAS3Utils.getTags(proj),
            definitions: OAS3Utils.getSchemaDefinitions(proj, options, 'OAS2'),
            responses: OAS3Utils.getResponses(proj, 'OAS2'),
            parameters: OAS3Utils.getParams(proj, 'OAS2'),
            paths: OAS3Utils.getPaths(proj, 'OAS2', options)
        };
        return obj;
    }

    exportOAS3(proj: ApiProject, options?: SwaggerOption): OpenAPIV3_1.Document {
        proj = Utils.clone(proj);
        var obj: OpenAPIV3_1.Document = {
            openapi: '3.0.1',
            info: OAS3Utils.getInfo(proj),
            ... (proj.setting && { servers: OAS3Utils.getServers(proj) }),
            tags: OAS3Utils.getTags(proj),
            paths: OAS3Utils.getPaths(proj, 'OAS3', options),
            components: {
                ...(OAS3Utils.getComponents(proj, options))
            }
        };
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



    private getTraitByName(proj: ApiProject, tName) {
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