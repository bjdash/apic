import { ApiEndp, ApiProject, ApiTrait } from "../models/ApiProject.model";
import { Utils } from "../services/utils.service";

export class ApiProjectUtils {
    static importTraitData(traitId, endp: ApiEndp, project: ApiProject): ApiEndp {
        if (!traitId) return;
        var trait: ApiTrait = project.traits[traitId];
        if (!trait) return;
        endp = Utils.clone(endp);

        //add responses from trait
        let responses = [...endp.responses];
        trait.responses?.forEach(resp => {
            if (!resp.noneStatus) {
                let existing = responses.findIndex(r => r.code == resp.code);
                if (existing >= 0) {
                    responses[existing] = { ...resp, fromTrait: true, traitId, traitName: trait.name }
                } else {
                    responses.push({ ...resp, fromTrait: true, traitId, traitName: trait.name })
                }
            }
        })
        endp.responses = responses;

        //add path params from trait
        let currentPathParams = endp.pathParams;
        endp.pathParams = {
            ...currentPathParams,
            properties: {
                ...currentPathParams.properties,
                ...trait.pathParams.properties
            },
            required: [...(currentPathParams.required || []), ...(trait.pathParams.required || [])]
        }


        // //add query params from trait
        let currentQueryParams = endp.queryParams;
        endp.queryParams = {
            ...currentQueryParams,
            properties: {
                ...currentQueryParams.properties,
                ...trait.queryParams.properties
            },
            required: [...(currentQueryParams.required || []), ...(trait.queryParams.required || [])]
        }

        // //add headers from trait
        let currentHeaders = endp.headers;
        endp.headers = {
            ...currentHeaders,
            properties: {
                ...currentHeaders.properties,
                ...trait.headers.properties
            },
            required: [...(currentHeaders.required || []), ...(trait.headers.required || [])]
        }

        return endp;
    }

    static removeTraitData(traitId: string, endpoint: ApiEndp, project: ApiProject): ApiEndp {
        if (!traitId) return;

        // remove responses from endpoint belonging to this trait
        let responses = endpoint.responses.filter(resp => resp.traitId !== traitId);

        var trait: ApiTrait = project.traits[traitId];

        //remove path params
        let pathParams = { ...endpoint.pathParams }
        let traitPathParams = Utils.objectKeys(trait.pathParams?.properties);
        traitPathParams.forEach(p => {
            delete pathParams.properties[p];
            pathParams.required = pathParams.required?.filter(r => r != p) || []
        })

        //remove headers
        let headers = { ...endpoint.headers }
        let traitHeaders = Utils.objectKeys(trait.headers?.properties);
        traitHeaders.forEach(p => {
            delete headers.properties[p];
            headers.required = headers.required?.filter(r => r != p) || []
        })

        //remove query params
        let queryParams = { ...endpoint.queryParams }
        let traitqueryParams = Utils.objectKeys(trait.queryParams?.properties);
        traitqueryParams.forEach(p => {
            delete queryParams.properties[p];
            queryParams.required = queryParams.required?.filter(r => r != p) || []
        })

        return { ...endpoint, responses, pathParams, headers, queryParams };
    }

    static getTraitQueryParamNames(traitId, project: ApiProject) {
        var trait: ApiTrait = project.traits[traitId];
        if (!trait) return [];
        return Utils.objectKeys(trait.queryParams.properties)
    }
    static getTraitHeaderNames(traitId, project: ApiProject) {
        var trait: ApiTrait = project.traits[traitId];
        if (!trait) return [];
        return Utils.objectKeys(trait.headers.properties)
    }

    static getModeldefinitions(project: ApiProject) {
        var modelRefs = {};
        Utils.objectValues(project.models).forEach(model => {
            modelRefs[model.nameSpace] = model.data;

        })
        return modelRefs;
    }
}