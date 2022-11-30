import { ApiProject } from '../models/ApiProject.model';
import { Injectable } from "@angular/core";
import { Utils } from './utils.service';
import { OpenAPIV2, OpenAPIV3_1 } from 'openapi-types';
import { OASUtils } from '../utils/OAS.utils';
import { Env } from '../models/Envs.model';
export interface ExportOption {
    includeApicIds?: boolean
}

@Injectable()
export class ImportExportService {
    constructor() {

    }

    importOAS2(spec: OpenAPIV2.Document, optn) {
        if (!spec.swagger) return;
        var proj: ApiProject = OASUtils.parseOasSpecBase(spec);

        let envs = OASUtils.parseServers(spec);
        if (envs?.length > 0) {
            proj.setting.host = envs[0].vals.find(kv => kv.key === 'host').val;
            proj.setting.basePath = envs[0].vals.find(kv => kv.key === 'basePath').val;
            proj.setting.protocol = envs[0].vals.find(kv => kv.key === 'scheme').val;
        }

        proj.tags = OASUtils.parseTags(spec);
        proj.securityDefinitions = OASUtils.parseSecuritySchemes(spec);
        //parse modesl
        let modelsData = OASUtils.parseSchemaDefinitions(spec);
        proj.models = { ...proj.models, ...modelsData.models }
        proj.folders = { ...proj.folders, ...modelsData.folders }
        //parse parameter
        proj.traits = { ...proj.traits, ...OASUtils.parseParameters(spec, proj) }
        let traitData = OASUtils.parseResponses(spec, proj);
        proj.traits = { ...proj.traits, ...traitData.traits };
        // proj.examples = {...proj.examples, ...traitData.examples};
        //parse paths
        let endpointsData = OASUtils.parsePaths(spec, optn, proj);
        proj.endpoints = endpointsData.endpoints;
        proj.folders = { ...proj.folders, ...endpointsData.folders };
        return proj;
    }

    importOAS3(spec: OpenAPIV3_1.Document, optn): ApiProject {
        if (!spec.openapi) return;
        var proj: ApiProject = OASUtils.parseOasSpecBase(spec);
        let envs = OASUtils.parseServers(spec);
        if (envs?.length > 0) {
            proj.setting.host = envs[0].vals.find(kv => kv.key === 'host').val;
            proj.setting.basePath = envs[0].vals.find(kv => kv.key === 'basePath').val;
            proj.setting.protocol = envs[0].vals.find(kv => kv.key === 'scheme').val;
        }
        proj.tags = OASUtils.parseTags(spec);
        proj.securityDefinitions = OASUtils.parseSecuritySchemes(spec);
        //parse modes1
        let modelsData = OASUtils.parseSchemaDefinitions(spec);
        proj.models = { ...proj.models, ...modelsData.models }
        proj.folders = { ...proj.folders, ...modelsData.folders }
        //parse examples
        let examplesData = OASUtils.parseExamples(spec);
        proj.examples = { ...proj.examples, ...examplesData.examples }
        proj.folders = { ...proj.folders, ...examplesData.folders }
        //parse parameter
        proj.traits = { ...proj.traits, ...OASUtils.parseParameters(spec, proj) }
        let traitData = OASUtils.parseResponses(spec, proj);
        proj.traits = { ...proj.traits, ...traitData.traits };
        proj.examples = { ...proj.examples, ...traitData.examples };
        //parse paths
        let endpointsData = OASUtils.parsePaths(spec, optn, proj);
        proj.endpoints = endpointsData.endpoints;
        proj.folders = { ...proj.folders, ...endpointsData.folders }
        proj.examples = { ...proj.examples, ...endpointsData.examples };
        return proj;
    }


    exportOAS(proj: ApiProject, options?: ExportOption): OpenAPIV2.Document {
        proj = Utils.clone(proj);
        var obj: OpenAPIV2.Document = {
            swagger: '2.0',
            info: OASUtils.prepareOasInfo(proj),
            ...(proj.setting?.basePath && { basePath: proj.setting.basePath }),
            ...(proj.setting?.host && { host: proj.setting.host }),
            ... (proj.setting?.protocol && { schemes: [proj.setting.protocol] }),
            securityDefinitions: OASUtils.prepareOasSecuritySchemes(proj, "OAS2"),
            tags: OASUtils.prepareOasTags(proj),
            definitions: OASUtils.prepareOasSchemaDefinitions(proj, options, 'OAS2'),
            responses: OASUtils.prepareOasResponses(proj, 'OAS2'),
            parameters: OASUtils.prepareOasParams(proj, 'OAS2'),
            paths: OASUtils.prepareOasPaths(proj, 'OAS2', options)
        };
        return obj;
    }

    exportOAS3(proj: ApiProject, env: Env, options?: ExportOption): OpenAPIV3_1.Document {
        proj = Utils.clone(proj);
        var obj: OpenAPIV3_1.Document = {
            openapi: '3.0.1',
            info: OASUtils.prepareOasInfo(proj),
            ... (proj.setting && { servers: OASUtils.prepareOasServers(proj, env) }),
            tags: OASUtils.prepareOasTags(proj),
            paths: OASUtils.prepareOasPaths(proj, 'OAS3', options),
            components: {
                ...(OASUtils.prepareOas3Components(proj, options))
            }
        };

        let exportStr = JSON.stringify(obj);
        exportStr = exportStr.replace(/#\/definitions\//g, '#\/components\/schemas\/')
        exportStr = exportStr.replace(/#\/responses\//g, '#\/components\/responses\/')
        exportStr = exportStr.replace(/#\/parameters\//g, '#\/components\/parameters\/')
        return JSON.parse(exportStr);
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
