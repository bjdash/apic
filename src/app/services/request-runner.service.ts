import { Injectable } from '@angular/core';
import { CompiledApiRequest } from '../models/CompiledRequest.model';
import { KeyVal } from '../models/KeyVal.model';
import { ApiRequest } from '../models/Request.model';
import { RunResponse } from '../models/RunResponse.model';
import { RunResult } from '../models/RunResult.model';
import { TestResponse } from '../models/TestResponse.model';
import { TestScript } from '../models/TestScript.model';
import apic from '../utils/apic';
import { METHOD_WITH_BODY, RESTRICTED_HEADERS } from '../utils/constants';
import { InterpolationService } from './interpolation.service';
import { TesterService } from './tester.service';
import { Utils } from './utils.service';


@Injectable({
  providedIn: 'root'
})
export class RequestRunnerService {
  private _xhr: XMLHttpRequest;
  private sentTime: number;

  private defaultLogMsg = 'Logs can be added in PreRun/PostRun scripts with "log()" function. Eg: log($response)';

  constructor(
    private tester: TesterService,
    private interpolationService: InterpolationService
  ) {
    this.onreadystatechange = this.onreadystatechange.bind(this)
  }

  run(req: ApiRequest): Promise<RunResult> {
    return new Promise(async (resolve, reject) => {
      let $request: CompiledApiRequest = this.prepareRequestForRun(req);
      let preRunResponse: TestResponse = null;
      if (req.prescript) {
        var script: TestScript = {
          type: 'prescript',
          script: $request.prescript,
          $request
        };
        preRunResponse = await this.tester.runScript(script);
      }

      $request = this.interpolateReq($request, req);

      this._xhr = new XMLHttpRequest();
      this._xhr.open($request.method, $request.url, true);

      this.addHeadersFromObj($request.headers);
      this._xhr.onreadystatechange = (event) => {
        this.onreadystatechange(event, $request, preRunResponse, resolve)
      };

      this.sentTime = Date.now();
      if ($request.bodyData) {
        //TODO
        // req.request.body = Utils.getReqBody(BODY, req.request.bodyMeta.type);
        this._xhr.send($request.bodyData);
      } else {
        // req.request.body = {};
        this._xhr.send();
      }
    });
  }

  async onreadystatechange(event, $request: CompiledApiRequest, preRunResponse: TestResponse, resolve) {
    if (event.target.readyState === 4) {
      //calculating time taken
      var respTime = new Date().getTime();
      var timeDiff = respTime - this.sentTime;
      var target = event.target;
      var headerStr = target.getAllResponseHeaders();
      var $response: RunResponse = {
        headersStr: headerStr, // not available in apic-cli
        headers: Utils.prepareHeadersObj(headerStr),
        status: target.status,
        statusText: target.statusText,
        readyState: target.readyState,
        body: target.response,
        respSize: 'Unknown',
        timeTaken: timeDiff,
        timeTakenStr: Utils.formatTime(timeDiff),
        data: null,
        logs: preRunResponse?.logs || [this.defaultLogMsg],
        tests: preRunResponse?.tests || []
      };
      $response.respSize = this.getResponseSize($response)
      //convert response to json object
      try {
        $response.data = JSON.parse($response.body);
      } catch (e) {
        console.info('The response cant be converted to JSON');
      }

      //Run postrun script
      if ($request.postscript) {
        var script: TestScript = {
          type: 'postscript',
          script: $request.postscript,
          $request,
          $response
        };
        let postRunResponse: TestResponse = await this.tester.runScript(script);
        $response.logs = [...$response.logs, ...postRunResponse.logs];
        $response.tests = [...$response.tests, ...postRunResponse.tests];
      }
      // _this.req.response = respObj;
      // if (_this.req.postscript) {
      //   var script = {
      //     type: 'postscript',
      //     req: _this.req
      //   };
      //   _this.listenForMessage(_this.postRunCB);
      //   Tester.run(script);
      // } else {
      //   _this.req.tests = [];
      //   _this.defer.resolve(_this.req);
      // }

      resolve({ req: $request, resp: $response })


    }
  }

  /**
   * Prepares request for run, variables will not be interpolated yet
   */
  prepareRequestForRun(req: ApiRequest): CompiledApiRequest {
    const { _id, url, method, prescript, postscript, respCodes } = req;
    let newReq: CompiledApiRequest = { _id, url, method, prescript, postscript, respCodes };

    //interpolating URL
    newReq.url = this.checkForHTTP(newReq.url);


    //interpolate query params
    let queryParams = req.Req.url_params
      ?.filter(qp => qp.key && qp.active)
      ?.map(qp => {
        return {
          key: qp.key,
          val: qp.val,
          active: qp.active
        }
      })
    newReq.queryParams = Utils.keyValPairAsObject(queryParams)

    //interpolating header key and values
    let headersList = req.Req.headers
      ?.filter(h => h.key && h.active)
      ?.map(qp => {
        return {
          key: qp.key,
          val: qp.val,
          active: qp.active
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

  interpolateReq($request: CompiledApiRequest, originalReq: ApiRequest): CompiledApiRequest {
    let { url, headers, queryParams, body } = $request, bodyData;
    headers = this.interpolationService.interpolateObject(headers);
    queryParams = this.interpolationService.interpolateObject(queryParams);
    url = this.interpolationService.interpolate(this.prepareQueryParams(url, queryParams || {}));
    if (METHOD_WITH_BODY.indexOf($request.method) >= 0 && $request.bodyType) {
      switch ($request.bodyType) {
        case 'x-www-form-urlencoded':
          body = this.interpolationService.interpolateObject(body);
          bodyData = Utils.getUrlEncodedXForm(body);
          break;
        case 'form-data':
          body = this.interpolationService.interpolateObject(body);
          let formData = originalReq.Body.formData.filter(xf => xf.key && xf.active)
            .map(xf => {
              return {
                active: xf.active,
                key: xf.key,
                val: xf.val,
                type: xf.type,
                meta: xf.meta,
              }
            })
          bodyData = Utils.getFormDataBody(formData);
          break;
        case 'raw':
          let rawBody = this.interpolationService.interpolate(originalReq.Body.rawData);
          bodyData = rawBody;
          if (rawBody && originalReq.Body.selectedRaw?.val?.includes('json')) {
            try {
              body = JSON.parse(rawBody);
            } catch (e) {
              console.error(`Unable to convert request body to json`, e);
              body = rawBody;
            }
          } else {
            body = rawBody;
          }
          break;
        case 'graphql':
        //TODO:
      }
    }

    return {
      ...$request,
      url,
      headers,
      queryParams,
      body,
      bodyData
    }
  }

  addHeadersFromObj(headers) {
    for (let [key, val] of Utils.objectEntries(headers)) {
      if (key) {
        var headerName = key.toUpperCase().trim();
        if (RESTRICTED_HEADERS.includes(headerName) || headerName.startsWith('SEC-') || headerName.startsWith('PROXY-')) {
          key = 'APIC-' + key;
        }
        try {
          this._xhr.setRequestHeader(key, val);
        } catch (e) {
          var m = e.message;
          console.warn(m.slice(m.indexOf(':') + 1).trim());
        }
      }
    }
  };

  checkForHTTP(url) {
    if (url.indexOf('http') !== 0) {
      url = 'http://' + url;
    }
    return url;
  }

  prepareQueryParams(url: string, params: { [key: string]: string }): string {
    var queryString = Utils.objectEntries(params)
      .map(([key, val]) => encodeURIComponent(key) + '=' + encodeURIComponent(val));

    if (queryString.length > 0) {
      //check if URL already has querystrings
      if (url.indexOf('?') > 0) {
        return url + '&' + queryString.join('&');
      }
      return url + '?' + queryString.join('&');
    }
    return url;
  }

  getResponseSize(resp: RunResponse) {
    var size = resp.headers['lontent-length'];
    if (size === undefined) {
      if (resp.body) {
        size = resp.body.length;
      }
    }
    return size === undefined ? 'Unknown' : size >= 1024 ? size >= 1048576 ? (size / 1048576).toFixed(1) + ' MB' : (size / 1024).toFixed(1) + ' KB' : size + ' B';
  }

  abort() {
    this._xhr.abort();
  }
}
