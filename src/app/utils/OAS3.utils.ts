import { ApiProject } from '../models/ApiProject.model';
import { OpenAPIV2, OpenAPIV3_1 } from 'openapi-types';
import { Utils } from '../services/utils.service';
import { SwaggerOption } from '../services/swagger.service';
import { METHOD_WITH_BODY } from './constants';
import { JsonSchemaService } from '../components/common/json-schema-builder/jsonschema.service';

type OasTypes = 'OAS2' | 'OAS3';
type SchemaType<T> =
    T extends "OAS3" ? { [key: string]: OpenAPIV3_1.SchemaObject } :
    T extends "OAS2" ? { [key: string]: OpenAPIV2.SchemaObject } :
    never;
type ResponseType<T> =
    T extends "OAS3" ? { [key: string]: OpenAPIV3_1.ResponseObject } :
    T extends "OAS2" ? { [key: string]: OpenAPIV2.ResponseObject } :
    never;
type ParamType<T> =
    T extends "OAS3" ? { [key: string]: OpenAPIV3_1.ParameterObject } :
    T extends "OAS2" ? { [key: string]: OpenAPIV2.ParameterObject } :
    never;
type PathType<T> =
    T extends "OAS3" ? { [key: string]: OpenAPIV3_1.PathItemObject } :
    T extends "OAS2" ? { [key: string]: OpenAPIV2.PathItemObject } :
    never;

export class OAS3Utils {
    static getInfo(proj: ApiProject): OpenAPIV3_1.InfoObject {
        let info: OpenAPIV3_1.InfoObject = {
            title: proj.title,
            description: proj.description,
            version: proj.version,
            termsOfService: proj.termsOfService
        };

        if (proj.contact) {
            info.contact = {
                ... (proj.contact.name && { name: proj.contact.name }),
                ... (proj.contact.url && { url: proj.contact.url }),
                ... (proj.contact.email && { email: proj.contact.email })
            };
        }

        if (proj.license?.name) {
            info.license = {
                ...(proj.license.name && { name: proj.license.name }),
                ... (proj.license.url && { url: proj.license.url })
            };
        }

        return info;
    }

    static getServers(proj: ApiProject): OpenAPIV3_1.ServerObject[] {
        //TODO: Read other env vars if any and add to variables
        if (!proj.setting.protocol) proj.setting.protocol = '';
        return (Array.isArray(proj.setting.protocol) ? proj.setting.protocol : [proj.setting.protocol]).map(scheme => {
            let basePath = (proj.setting.basePath || '').replace(/\/$/, '') // Trailing slashes generally shouldn't be included
            let server = {
                url: (scheme ? scheme + ':' : '') + '//' + (proj.setting.host || '') + basePath
            }
            return server;
        });
    }

    static getTags(proj: ApiProject): OpenAPIV3_1.TagObject[] {
        if (proj.tags?.length > 0) {
            return proj.tags.map(tag => {
                let specTag: any = {
                    name: tag.name,
                    description: tag.description
                };
                if (tag.externalDocs?.url) {
                    specTag.externalDocs = tag.externalDocs
                }
                if (tag.xProperty?.length > 0) {
                    tag.xProperty.forEach(kv => {
                        if (kv.key) {
                            specTag[kv.key] = kv.val
                        }
                    });
                }
                return specTag;
            })
        } else {
            return [];
        }
    }

    static getSecuritySchemes(proj: ApiProject, type: OasTypes) {
        var secDefs = {};
        proj.securityDefinitions.forEach(function (def) {
            var defObj: any = {
                type: def.type,
                description: def.description || ''
            }

            //process x-properties
            def.xProperty?.forEach((prop) => {
                if (prop.key?.startsWith('x-')) {
                    defObj[prop.key] = prop.val
                }
            });

            if (type === 'OAS3') {
                switch (def.type) {
                    case 'basic':
                        defObj.type = 'http';
                        defObj.scheme = 'basic';
                        break;
                    case 'apiKey':
                        defObj.in = def.apiKey.in;
                        defObj.name = def.apiKey.name;
                        break;
                    case 'oauth2':
                        let flow: any = {};
                        let flowName = def.name;
                        if (def.oauth2.flow == 'application') {
                            flowName = 'clientCredentials';
                        }
                        if (def.oauth2.flow == 'accessCode') {
                            flowName = 'authorizationCode';
                        }
                        if (typeof def.oauth2.authorizationUrl !== 'undefined' && def.oauth2.authorizationUrl) {
                            flow.authorizationUrl = def.oauth2.authorizationUrl;
                        }
                        if (def.oauth2.tokenUrl) {
                            flow.tokenUrl = def.oauth2.tokenUrl;
                        }
                        flow.scopes = {};
                        if (def.oauth2.scopes.length > 0) {
                            def.oauth2.scopes.forEach((s) => {
                                flow.scopes[s.key] = s.val;
                            });
                        }
                        defObj.flows = {
                            [flowName]: flow
                        }
                        break;
                }
            } else {
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
            }
            secDefs[def.name] = defObj;
        });
        return secDefs;
    }

    static getComponents(proj: ApiProject, options?: SwaggerOption): OpenAPIV3_1.ComponentsObject {
        let components: OpenAPIV3_1.ComponentsObject = {};

        if (proj.securityDefinitions && proj.securityDefinitions.length > 0) {
            components.securitySchemes = OAS3Utils.getSecuritySchemes(proj, 'OAS3')
        }

        components.schemas = OAS3Utils.getSchemaDefinitions(proj, options, 'OAS3')
        components.parameters = OAS3Utils.getParams(proj, 'OAS3')
        components.responses = OAS3Utils.getResponses(proj, 'OAS3');

        return components;
    }

    static getPaths<T extends OasTypes>(proj: ApiProject, type: T, options?: SwaggerOption): PathType<T> {
        let paths: { [key: string]: OpenAPIV3_1.PathItemObject | OpenAPIV2.PathItemObject } = {};
        //add paths
        for (const [id, endp] of Utils.objectEntries(proj.endpoints)) {
            if (paths[endp.path] === undefined) {
                paths[endp.path] = {};
            }
            let reqObj: OpenAPIV3_1.OperationObject = {
                tags: endp.tags,
                summary: endp.summary,
                description: endp.description,
                parameters: [],
                ...(endp.operationId && { operationId: endp.operationId }),
                ...(endp.deprecated && { deprecated: endp.deprecated }),
                ...(options?.includeApicIds && { 'x-apic-id': endp._id }),
                ...(endp.security && {
                    security: endp.security.map((sec) => {
                        var secObj = {};
                        secObj[sec.name] = [];
                        return secObj;
                    })
                }),
                ...(type === 'OAS2' && {
                    consumes: endp.consumes,
                    produces: endp.produces,
                    ...(endp.schemes && { schemes: endp.schemes.map(s => s.key) })
                })
            }

            //TODO: Map schemes to server URL
            // for (var i= 0; i<endp.schemes.length; i++) {
            // reqobj.schemes.push(endp.schemes[i].key);
            //}}

            reqObj.responses = {};
            let produces = endp.produces || ['*/*'];
            for (var j = 0; j < endp.responses.length; j++) {
                let code = endp.responses[j].code;
                let response: any = {
                    description: endp.responses[j].desc ? endp.responses[j].desc : '',
                };
                if (type === 'OAS3') {
                    response.content = {};
                    for (let mimetype of produces) {
                        response.content[mimetype] = {};
                        response.content[mimetype].schema = endp.responses[j].data;
                        //TODO: Add support for examples in json schema builder
                        if (response.content[mimetype].schema.type == 'file') {
                            response.content[mimetype].schema = { type: 'string', format: 'binary' };
                        }
                    }
                } else {
                    response.schema = endp.responses[j].data;
                }
                reqObj.responses[code] = response;
            }

            //add query parameters
            for (const [key, schema] of Utils.objectEntries(endp.queryParams.properties as { [key: string]: any })) {
                let param = {
                    name: key,
                    in: 'query',
                    // style: form',
                    // explode: true,
                    description: schema.description ? schema.description : "",
                    required: endp.queryParams.required && endp.queryParams.required.indexOf(key) >= 0 ? true : false,
                    ...(type === 'OAS3' ? { schema } : schema)
                };
                reqObj.parameters.push(param);
            };

            //add headers
            for (const [key, schema] of Utils.objectEntries(endp.headers.properties as { [key: string]: any })) {
                let param = {
                    name: key,
                    in: 'header',
                    // style: simple',
                    description: schema.description ? schema.description : "",
                    required: endp.headers.required && endp.headers.required.indexOf(key) >= 0 ? true : false,
                    ...(type === 'OAS3' ? { schema } : schema)
                };
                reqObj.parameters.push(param);
            };

            //add path params
            for (const [key, schema] of Utils.objectEntries(endp.pathParams.properties as { [key: string]: any })) {
                let param = {
                    name: key,
                    in: 'path',
                    // style: simple',
                    description: schema.description ? schema.description : '',
                    required: endp.pathParams.required && endp.pathParams.required.indexOf(key) >= 0 ? true : false,
                    ...(type === 'OAS3' ? { schema } : schema)
                };
                reqObj.parameters.push(param);
            };

            if (METHOD_WITH_BODY.includes(endp.method.toUpperCase()) && endp.body) { //if the trait has body add body params
                if (type == 'OAS3') {
                    let reqBody: OpenAPIV3_1.RequestBodyObject;
                    switch (endp.body.type) {
                        case 'raw':
                            let consumes = endp.consumes || ['application/json'];
                            reqBody = {
                                content: {},
                                required: true
                                //description: schema.description ? schema.description : "",
                                //required: endp.body.data[x].required ? true: false
                            };
                            for (let mimetype of consumes) {
                                reqBody.content[mimetype] = {};
                                reqBody.content[mimetype].schema = endp.body.data;
                            }
                            break;
                        case 'form-data':
                        case 'x-www-form-urlencoded':
                            let contentType = endp.body.type === 'form-data' ? 'multipart/form-data' : 'application/x-www-form-urlencoded';
                            let schema: OpenAPIV3_1.SchemaObject = {
                                type: 'object',
                                properties: {},
                                required: []
                            }
                            endp.body.data.forEach(input => {
                                let item: OpenAPIV3_1.SchemaObject = {
                                    type: input.type,
                                    description: input.desc || '',
                                    ...(input.type == 'array' && { items: { type: 'string' } })
                                }

                                if (input.required) schema.required.push(input.key);
                                if ((input.type === 'file')) {
                                    item.type = 'string';
                                    item.format = 'binary';
                                }
                                schema.properties[input.key] = item;
                            });
                            reqBody = {
                                content: {
                                    [contentType]: { schema }
                                }
                            }
                            break;
                    }
                    reqObj.requestBody = reqBody
                } else {
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
            }

            // importing details from traits
            for (var j = 0; j < endp.traits.length; j++) {
                var traitObj = proj.traits[endp.traits[j]._id];
                let tName = traitObj.name;
                //responses
                for (var i = 0; i < traitObj.responses.length; i++) {
                    var xPath = 'trait.' + tName + '.' + traitObj.responses[i].code;
                    if (!traitObj.responses[i].noneStatus) {
                        let schema: OpenAPIV3_1.ReferenceObject = {
                            '$ref': (type === 'OAS3' ? '#/components/responses/' : '#/responses/') + xPath
                        };
                        reqObj.responses[traitObj.responses[i].code] = schema;
                    }
                }

                //path params
                if (traitObj.pathParams) {
                    for (const [key, schema] of Utils.objectEntries(traitObj.pathParams.properties)) {
                        var xPath = 'trait.' + tName + '.' + key;
                        reqObj.parameters.push({
                            '$ref': (type === 'OAS3' ? '#/components/parameters/' : '#/parameters/') + xPath

                        });
                    }
                }

                //query params
                for (const [key, schema] of Utils.objectEntries(traitObj.queryParams.properties)) {
                    var xPath = 'trait.' + tName + '.' + key;
                    reqObj.parameters.push({
                        '$ref': (type === 'OAS3' ? '#/components/parameters/' : '#/parameters/') + xPath

                    });
                }

                // header params
                for (const [key, schema] of Utils.objectEntries(traitObj.headers.properties)) {
                    var xPath = 'trait.' + tName + '.' + key;
                    reqObj.parameters.push({
                        '$ref': (type === 'OAS3' ? '#/components/parameters/' : '#/parameters/') + xPath
                    });
                }
            }
            paths[endp.path][endp.method] = reqObj;
        };
        return paths as PathType<T>;
    }

    static getSchemaDefinitions<T extends OasTypes>(proj: ApiProject, options: SwaggerOption, type: T): SchemaType<T> {
        let componentSchemas: { [key: string]: OpenAPIV3_1.SchemaObject | OpenAPIV2.SchemaObject } = {}

        //add definitions/models
        for (const [id, model] of Utils.objectEntries(proj.models)) {
            model.data = JsonSchemaService.sanitizeModel(model.data);
            componentSchemas[model.nameSpace] = model.data;
            if (options?.includeApicIds) {
                componentSchemas[model.nameSpace]['x-apic-id'] = model._id;
            }
        };
        return componentSchemas as SchemaType<T>;
    }

    static getResponses<T extends OasTypes>(proj: ApiProject, type: T): ResponseType<T> {
        let componentResponses: { [key: string]: OpenAPIV3_1.ResponseObject | OpenAPIV2.ResponseObject } = {};

        ////responses and parameters are added from traits 
        for (const [id, trait] of Utils.objectEntries(proj.traits)) {
            var responses = trait.responses;
            let tName = trait.name.replace(/\s/g, ' ');

            for (var i = 0; i < responses.length; i++) {
                var schema = responses[i].data;
                var name = 'trait.' + tName + '.' + responses[i].code;
                componentResponses[name] = {
                    description: responses[i].desc ? responses[i].desc : '',
                    ...(type === 'OAS3' ? { content: { '*/*': { schema } } } : { schema })
                };
            }
        }
        return componentResponses as ResponseType<T>;
    }

    static getParams<T extends OasTypes>(proj: ApiProject, type: T): ParamType<T> {
        let componentParameters: { [key: string]: OpenAPIV3_1.ParameterObject | OpenAPIV2.ParameterObject } = {};
        ////responses and parameters are added from traits,
        for (const [id, trait] of Utils.objectEntries(proj.traits)) {
            let tName = trait.name.replace(/\s/g, ' ');
            for (const [key, schema] of Utils.objectEntries(trait.pathParams?.properties as { [key: string]: any })) {
                let param = {
                    name: key,
                    in: 'path',
                    description: schema.description ? schema.description : '',
                    required: trait.pathParams.required && trait.pathParams.required.indexOf(key) >= 0 ? true : false,
                    ...(type === 'OAS3' ? { schema } : schema)
                }
                let name = 'trait.' + tName + '.' + key;
                componentParameters[name] = param;
            }

            for (const [key, schema] of Utils.objectEntries(trait.queryParams?.properties as { [key: string]: any })) {
                let param = {
                    name: key,
                    in: 'query',
                    description: schema.description ? schema.description : "",
                    required: trait.queryParams.required && trait.queryParams.required.indexOf(key) >= 0 ? true : false,
                    ...(type === 'OAS3' ? { schema } : schema)
                };
                var name = 'trait.' + tName + '.' + key;
                componentParameters[name] = param;
            }

            for (const [key, schema] of Utils.objectEntries(trait.headers?.properties as { [key: string]: any })) {
                let param = {
                    name: key,
                    in: 'header',
                    description: schema.description ? schema.description : "",
                    required: trait.headers.required && trait.headers.required.indexOf(key) >= 0 ? true : false,
                    ...(type === 'OAS3' ? { schema } : schema)
                };
                var name = 'trait.' + tName + '.' + key;
                componentParameters[name] = param; + key;
            };
        }
        return componentParameters as ParamType<T>;
    };

    static importOAS3(spec: OpenAPIV3_1.Document): ApiProject {
        if (spec.openapi) return;
        var proj: ApiProject = OAS3Utils.parseOasSpecBase(spec);

    }

    static parseOasSpecBase(spec: OpenAPIV3_1.Document) {
        var proj: ApiProject = {
            title: spec.info.title,
            description: spec.info.description || '',
            version: spec.info.version || '',
            termsOfService: spec.info.termsOfService || '',
            setting: {}
        }
        if (spec.info.license) {
            proj.license = {
                name: spec.info.license.name || '',
                url: spec.info.license.url || ''
            };
            proj.license.name = spec.info.license.name ? spec.info.license.name : '';
            proj.license.url = spec.info.license.url ? spec.info.license.url : '';
        }
        return proj;
    }

    static parseServers(spec: OpenAPIV3_1.Document) {
        var server = spec.servers && spec.servers[0];
        if (server) {
            let serverUrl = server.url, variables = server.variables;
            for (var variable in variables) {
                var variableObject = variables[variable] || {};
                if (variableObject['default']) {
                    var re = RegExp('{' + variable + '}', 'g');
                    serverUrl = serverUrl.replace(re, variableObject['default']);
                }
            }
        }
    }
}