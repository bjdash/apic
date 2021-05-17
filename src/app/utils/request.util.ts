import { CompiledApiRequest } from "../models/CompiledRequest.model";
import { ApiRequest, SavedResp } from "../models/Request.model";
import { RunResponse } from "../models/RunResponse.model";
import { Utils } from "../services/utils.service";
import apic from "./apic";
import { METHOD_WITH_BODY } from "./constants";

export class RequestUtils {
    static checkForHTTP(url) {
        if (url.indexOf('http') !== 0) {
            url = 'http://' + url;
        }
        return url;
    }

    /**
    * Prepares request for run, variables will not be interpolated yet
    */
    static getCompiledRequest(req: ApiRequest): CompiledApiRequest {
        const { _id, url, method, prescript, postscript, respCodes } = req;
        let newReq: CompiledApiRequest = { _id, url, method, prescript, postscript, respCodes };

        //interpolating URL
        newReq.url = RequestUtils.checkForHTTP(newReq.url);


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
        if (METHOD_WITH_BODY.indexOf(req.method) >= 0 && req.Body) {
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
                    //TODO://interpolating graphql (key and values)
                    req.Body.type = 'raw';
                    // newReq.bodyData = Utils.getGqlBody(req.Body.rawData, req.Body.gqlVars);
                    newReq.headers['Content-Type'] = 'application/json';
                    //TODO: populate body to be used with $request in test
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
}