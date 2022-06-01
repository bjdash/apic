import { ApiProject, ApiTag, SecurityDef } from './../models/ApiProject.model';
import { Injectable } from "@angular/core";
import apic from '../utils/apic';
import { JsonSchemaService } from '../components/common/json-schema-builder/jsonschema.service';
import { Utils } from './utils.service';
import { METHOD_WITH_BODY } from '../utils/constants';
import { OpenAPIV2, OpenAPIV3_1 } from 'openapi-types';
import { OAS3Utils } from '../utils/OAS3.utils';
import { Env } from '../models/Envs.model';
export interface SwaggerOption {
    includeApicIds?: boolean
}

@Injectable()
export class SwaggerService {
    constructor() {

    }

    importOAS2(spec: OpenAPIV2.Document, optn) {
        if (!spec.swagger) return;
        var proj: ApiProject = OAS3Utils.parseOasSpecBase(spec);

        let envs = OAS3Utils.parseServers(spec);
        if (envs?.length > 0) {
            proj.setting.host = envs[0].vals.find(kv => kv.key === 'host').val;
            proj.setting.basePath = envs[0].vals.find(kv => kv.key === 'basePath').val;
            proj.setting.protocol = envs[0].vals.find(kv => kv.key === 'scheme').val;
        }

        proj.tags = OAS3Utils.parseTags(spec);
        proj.securityDefinitions = OAS3Utils.parseSecuritySchemes(spec);
        //parse modesl
        let modelsData = OAS3Utils.parseSchemaDefinitions(spec);
        proj.models = { ...proj.models, ...modelsData.models }
        proj.folders = { ...proj.folders, ...modelsData.folders }
        //parse parameter
        proj.traits = { ...proj.traits, ...OAS3Utils.parseParameters(spec, proj) }
        //parse paths
        let endpointsData = OAS3Utils.parsePaths(spec, optn, proj);
        proj.endpoints = endpointsData.endpoints;
        proj.folders = { ...proj.folders, ...endpointsData.folders }
        return proj;
    }

    importOAS3(spec: OpenAPIV3_1.Document, optn): ApiProject {
        if (!spec.openapi) return;
        var proj: ApiProject = OAS3Utils.parseOasSpecBase(spec);
        let envs = OAS3Utils.parseServers(spec);
        if (envs?.length > 0) {
            proj.setting.host = envs[0].vals.find(kv => kv.key === 'host').val;
            proj.setting.basePath = envs[0].vals.find(kv => kv.key === 'basePath').val;
            proj.setting.protocol = envs[0].vals.find(kv => kv.key === 'scheme').val;
        }
        proj.tags = OAS3Utils.parseTags(spec);
        proj.securityDefinitions = OAS3Utils.parseSecuritySchemes(spec);
        //parse modes1
        let modelsData = OAS3Utils.parseSchemaDefinitions(spec);
        proj.models = { ...proj.models, ...modelsData.models }
        proj.folders = { ...proj.folders, ...modelsData.folders }
        //parse parameter
        proj.traits = { ...proj.traits, ...OAS3Utils.parseParameters(spec, proj) }
        //parse paths
        let endpointsData = OAS3Utils.parsePaths(spec, optn, proj);
        proj.endpoints = endpointsData.endpoints;
        proj.folders = { ...proj.folders, ...endpointsData.folders }
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

    exportOAS3(proj: ApiProject, env: Env, options?: SwaggerOption): OpenAPIV3_1.Document {
        proj = Utils.clone(proj);
        var obj: OpenAPIV3_1.Document = {
            openapi: '3.0.1',
            info: OAS3Utils.getInfo(proj),
            ... (proj.setting && { servers: OAS3Utils.getServers(proj, env) }),
            tags: OAS3Utils.getTags(proj),
            paths: OAS3Utils.getPaths(proj, 'OAS3', options),
            components: {
                ...(OAS3Utils.getComponents(proj, options))
            }
        };
        return obj;
    }

    exportRAW(proj: ApiProject, type) {
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

}