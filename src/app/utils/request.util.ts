import jsf from 'json-schema-faker';
import { JsonSchemaService } from '../components/common/json-schema-builder/jsonschema.service';
import { ApiEndp, ApiProject, MediaTypeSchema } from "../models/ApiProject.model";
import { CompiledApiRequest } from "../models/CompiledRequest.model";
import { ApiRequest, SavedResp } from "../models/Request.model";
import { RunResponse } from "../models/RunResponse.model";
import { Utils } from "../services/utils.service";
import apic from "./apic";
import { ApiProjectUtils } from "./ApiProject.utils";
import { METHOD_WITH_BODY } from "./constants";
import { SchemaDref } from "./SchemaDref";
import { AceUtils } from '../services/ace.utils';

export class RequestUtils {
  static {
    jsf.option('fillProperties', false);
  }
  static checkForHTTP(url: string) {
    if (url.toLowerCase().indexOf('http') !== 0) {
      url = 'http://' + url;
    }
    return url;
  }

  /**
  * Prepares request for run, variables will not be interpolated yet
  */
  static getCompiledRequest(req: ApiRequest): CompiledApiRequest {
    const { _id, url, method, prescript, postscript, respCodes, name } = req;
    let newReq: CompiledApiRequest = { _id, url, method, prescript, postscript, respCodes, name };

    //interpolate query params
    let queryParams = req.Req.url_params
      ?.filter(qp => qp.key && (!qp.hasOwnProperty('active') || qp.active))
      ?.map(qp => {
        return {
          key: qp.key,
          val: qp.val,
          active: true
        }
      })
    newReq.queryParams = Utils.keyValPairAsObject(queryParams)

    //interpolating header key and values
    let headersList = req.Req.headers
      ?.filter(h => h.key && (!h.hasOwnProperty('active') || h.active))
      ?.map(h => {
        return {
          key: h.key.toLowerCase(),
          val: h.val,
          active: true
        }
      });
    newReq.headers = {
      ...Utils.keyValPairAsObject(headersList),
      'X-APIC-REQ-ID': apic.s8() + '-' + apic.s8()
    }

    //Prepare body to be sent with the request
    if (METHOD_WITH_BODY.indexOf(req.method.toUpperCase()) >= 0 && req.Body) {
      newReq.bodyType = req.Body.type;
      switch (req.Body.type) {
        case 'x-www-form-urlencoded':
          //parsing x-www-form-urlencoded form data (key and values)
          if (req.Body?.xForms) {
            let xForms = req.Body.xForms.filter(xf => xf.key && xf.active)
              .map(xf => {
                return {
                  active: xf.active,
                  key: xf.key,
                  val: xf.val
                }
              });
            newReq.body = Utils.keyValPairAsObject(xForms);
          } else {
            newReq.body = {}
          }
          newReq.headers['Content-Type'] = 'application/x-www-form-urlencoded';
          break;
        case 'raw':
          // parsing raw body data
          let rawBody = req.Body.rawData;
          newReq.headers['Content-Type'] = req.Body.selectedRaw.val;
          if (rawBody && req.Body.selectedRaw?.val?.includes('json')) {
            try {
              newReq.body = JSON.parse(rawBody);
            } catch (e) {
              console.error(`Unable to convert request body to json`, e);
              newReq.body = rawBody;
            }
          } else {
            newReq.body = rawBody;
          }
          break;
        case 'graphql':
          // req.Body.type = 'raw';
          newReq.headers['Content-Type'] = 'application/json';
          newReq.body = {
            query: req.Body.rawData
          };
          if (req.Body.gqlVars) {
            try {
              let variables = JSON.parse(req.Body.gqlVars.trim());
              if (variables) {
                newReq.body.variables = variables;
              }
            } catch (e) {
              console.error('Invalid graphql variables', e);
            }
          }
          break;
        case 'form-data':
          //parsing form data (key and values)
          let formData = req.Body.formData.filter(xf => xf.key && xf.active)
            .map(xf => {
              return {
                active: xf.active,
                key: xf.key,
                val: xf.val,
                type: xf.type,
                meta: xf.meta,
              }
            })
          newReq.body = Utils.keyValPairAsObject(formData);
          break;
      }
    }

    return newReq;
  }

  static formatResponseForSave(response: RunResponse): SavedResp {
    return {
      data: response.body,
      headers: response.headers,
      size: response.respSize,
      status: response.status,
      statusText: response.statusText,
      time: response.timeTaken
    }
  }

  static endpointToApiRequest(endp: ApiEndp, project: ApiProject, mocking = false): ApiRequest {
    if (endp.traits) {
      for (var i = 0; i < endp.traits.length; i++) {
        endp = ApiProjectUtils.importTraitData(endp.traits[i]._id, { ...endp }, project);
      }
    }
    let modelRefs = ApiProjectUtils.getModeldefinitions(project);
    let responseRefs = ApiProjectUtils.getTraitNamedResponsesObj(project)

    var request: ApiRequest = {
      url: endp.path,
      method: endp.method.toUpperCase(),
      _id: endp._id,
      description: endp.description,
      name: endp.summary,
      postscript: endp.postrun ? endp.postrun : '',
      prescript: endp.prerun ? endp.prerun : '',
      respCodes: [],
      Req: {
        headers: [],
        url_params: []
      },
      Body: {}
    };

    if (mocking) {
      request.url = 'https://apic.app/mock/' + project.simKey + (project.setting?.basePath || '') + endp.path;
      //replace {pathParams} in url with {{envVars}}
      Utils.objectEntries(endp.pathParams?.properties).forEach(([key, val]) => {
        request.url = request.url.replace(`{${key}}`, `{{${key}}}`)
      });
    } else {
      //select an environment if we have settings(host, basePath) saved for the project
      if (project.setting) {
        var url = '{{scheme}}{{host}}';
        var basePath = '';

        if (project.setting.basePath) {
          basePath = '{{basePath}}';
          if (project.setting.basePath.indexOf('/') !== 0) {
            basePath = '/' + basePath;
          }
        }
        var endpUrl = endp.path;
        var params = [], rxp = /{([^}]+)}/g, curMatch;

        while (curMatch = rxp.exec(endpUrl)) {
          var match = curMatch[1];
          endpUrl = endpUrl.replace('{' + match + '}', '{{' + match + '}}');
        }
        request.url = url + basePath + endpUrl;
      } else {
        request.url = 'http://{{host}}' + endp.path;
      }
    }


    //copy response codes and their respective schema
    if (endp.responses && endp.responses.length > 0) {
      for (var j = 0; j < endp.responses.length; j++) {
        var tmpSchema: any = Utils.clone(endp.responses[j].data);
        tmpSchema.definitions = modelRefs;
        tmpSchema.responses = { ...responseRefs };
        try {
          let derefedSchema = new SchemaDref().dereference(tmpSchema);
          delete derefedSchema.definitions;
          delete derefedSchema.responses;
          request.respCodes.push({
            code: endp.responses[j].code,
            data: derefedSchema
          });
        } catch (e) {
          console.error('Circular JSON schema reference encountered.', e)
        }
      }
    }
    //copy headers
    var headers = endp.headers;
    if (headers?.properties) {
      Utils.objectEntries(headers.properties as { [key: string]: any }).forEach(([key, val]) => {
        var h = { key: key, val: val.default ? val.default : '' };
        request.Req.headers.push(h);
      })
    } else {
      request.Req.headers.push({ key: '', val: '' });
    }
    //copy query params
    var queryParams = endp.queryParams
    if (queryParams?.properties) {
      Utils.objectEntries(queryParams.properties as { [key: string]: any }).forEach(([key, val]) => {
        request.Req.url_params.push({ key: key, val: val.default ? val.default : '' });
      });
    } else {
      request.Req.url_params.push({ key: '', val: '' });
    }

    //add auth details based on selected seccurity values
    if (endp.security?.length > 0 && project.securityDefinitions) {
      endp.security.forEach((selectedSec) => {
        var security = project.securityDefinitions.find(function (s) {
          return s.name === selectedSec.name;
        })
        switch (security.type) {
          case 'apiKey':
            //TODO: check for in header/query
            request.Req[security.apiKey.in === 'header' ? 'headers' : 'url_params'].unshift({ key: security.apiKey.name, val: '{{apiKey}}' });
            break;
          case 'basic':
            request.Req.headers.unshift({ key: 'Authorization', val: '{{apic.basicAuth(basicAuthUser, basicAuthPassword)}}' });
            break;
        }
      })
    }

    //prepare body
    if (endp.body) {
      let bodyToUse: MediaTypeSchema = endp.body.data?.find(bodyItem => bodyItem.mime === 'application/json');
      if (!bodyToUse)
        bodyToUse = endp.body.data
          ?.find(bodyItem => bodyItem.mime === 'application/x-www-form-urlencoded' || bodyItem.mime.indexOf("multipart/") == 0);
      if (!bodyToUse) {
        if (endp.body.data.length > 0) {
          bodyToUse = endp.body.data[0];
        } else {
          bodyToUse = {
            schema: JsonSchemaService.getEmptySchema(),
            mime: 'application/json',
            examples: []
          }
        }
      }

      if (bodyToUse.mime === 'application/x-www-form-urlencoded') {
        request.Body.type = 'x-www-form-urlencoded'
        request.Body.xForms = [];
        for (var x = 0; x < bodyToUse.schema.length; x++) {
          request.Body.xForms.push({ key: bodyToUse.schema[x].key, val: '' });
        }
      } else if (bodyToUse.mime.indexOf('multipart/') == 0) {
        request.Body.type = 'form-data';
        request.Body.formData = [];
        for (var x = 0; x < bodyToUse.schema.length; x++) {
          request.Body.formData.push({ key: bodyToUse.schema[x].key, val: '' });
        }
      } else {
        request.Body.type = 'raw';
        request.Body.selectedRaw = { name: AceUtils.getModeFromContentType(bodyToUse.mime), val: bodyToUse.mime };
        var schema = { ...bodyToUse.schema };
        if (schema) {
          schema.definitions = modelRefs;
          var sampleData = {};
          try {
            sampleData = jsf.generate(Utils.clone(schema));
          } catch (e) {
            console.error('Failed to generate sample data', e);
          }
          request.Body.rawData = JSON.stringify(sampleData, null, '\t');
        }
      }
    }
    return request
  }
}
