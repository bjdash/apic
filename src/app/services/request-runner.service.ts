import { Injectable } from '@angular/core';
import { Store } from '@ngxs/store';
import { take } from 'rxjs/operators';
import { EnvsAction } from '../actions/envs.action';
import { CompiledApiRequest } from '../models/CompiledRequest.model';
import { ParsedEnv } from '../models/Envs.model';
import { ApiRequest } from '../models/Request.model';
import { RunResponse } from '../models/RunResponse.model';
import { RunResult } from '../models/RunResult.model';
import { TestResponse } from '../models/TestResponse.model';
import { SandboxTestMessage } from '../models/Sandbox.model';
import { EnvState } from '../state/envs.state';
import { METHOD_WITH_BODY, RESTRICTED_HEADERS } from '../utils/constants';
import { RequestUtils } from '../utils/request.util';
import { ApicAgentService } from './apic-agent.service';
import { InterpolationOption, InterpolationService } from './interpolation.service';
import { TesterOptions, SandboxService } from './tester.service';
import { Utils } from './utils.service';
import { environment } from 'src/environments/environment';
import ExtentionHelper from './extention.helper';

export interface RunOption {
  useInMemEnv?: boolean,
  skipinMemUpdate?: boolean, //always to be used with useEnv below
  useEnv?: ParsedEnv //if specified, the specified env will be used for interpolation
}

@Injectable({
  providedIn: 'root'
})
export class RequestRunnerService {
  private _xhr: XMLHttpRequest;
  private sentTime: number;

  private defaultLogMsg = 'Logs can be added in PreRun/PostRun scripts with "log()" function. Eg: log($response)';

  constructor(
    private tester: SandboxService,
    private apicAgentService: ApicAgentService,
    private store: Store,
    private interpolationService: InterpolationService
  ) {
    this.onreadystatechange = this.onreadystatechange.bind(this)
  }

  run(req: ApiRequest, options?: RunOption): Promise<RunResult> {
    if (!options) {
      options = { skipinMemUpdate: false, useInMemEnv: true }
    }
    return new Promise(async (resolve, reject) => {
      if (options?.skipinMemUpdate && !options?.hasOwnProperty('useEnv')) {
        reject({ message: 'skipinMemUpdate should be used along with useEnv.' })
        return;
      }
      if (!req.url) {
        reject({ message: 'Invalid URL.' })
        return;
      }
      if (this.apicAgentService.isOnline()) {
        await this.runViaAgent(req, options, resolve, reject)
        return;
      }
      let $request: CompiledApiRequest = RequestUtils.getCompiledRequest(req);
      let preRunResponse: TestResponse = null;
      const testerOption: TesterOptions = { skipinMemUpdate: options?.skipinMemUpdate }
      if (req.prescript) {
        var script: SandboxTestMessage = {
          type: 'prescript',
          script: $request.prescript,
          $request
        };
        preRunResponse = await this.tester.runScript(script, testerOption);
        //if skipinMemUpdate is true then any new environment vars added wont be visible so add them to options.useEnv
        if (options?.skipinMemUpdate) {
          options.useEnv.vals = { ...options.useEnv.vals, ...preRunResponse.inMem }
        }
      }

      $request = this.interpolateReq($request, req, options);

      this._xhr = new XMLHttpRequest();
      this._xhr.open($request.method, $request.url, true);

      await this.addHeadersFromObj($request);
      this._xhr.onreadystatechange = (event) => {
        this.onreadystatechange(event, $request, preRunResponse, resolve, testerOption)
      };

      this.sentTime = Date.now();
      if ($request.bodyData) {
        this._xhr.send($request.bodyData);
      } else {
        // req.request.body = {};
        this._xhr.send();
      }
    });
  }

  async runViaAgent(req: ApiRequest, options: RunOption, resolve, reject) {
    try {
      let envsVals: { saved: { [key: string]: string }, inMem: { [key: string]: string } } = {
        saved: {},
        inMem: {}
      };
      if (options?.useEnv) {
        //use the env specified
        envsVals.saved = { ...envsVals.saved, ...options.useEnv.vals };
      } else {
        //use the current selected env
        let selectedEnv = await this.store.select(EnvState.getSelected).pipe(take(1)).toPromise();
        envsVals.saved = { ...envsVals.saved, ...(selectedEnv?.vals || {}) }
      }
      if (options?.useInMemEnv) {
        let inMemEnvs = await this.store.select(EnvState.getInMemEnv).pipe(take(1)).toPromise();
        envsVals.inMem = { ...envsVals.inMem, ...inMemEnvs }
      }
      console.log('using env', envsVals)
      let res = await this.apicAgentService.runRequest(req, envsVals);
      resolve(res);
      if (!options?.skipinMemUpdate) {
        this.store.dispatch(new EnvsAction.SetInMem(res.$response.inMemEnvs))
      }
    } catch (e) {
      reject(e);
    }
  }

  async onreadystatechange(event, $request: CompiledApiRequest, preRunResponse: TestResponse, resolve, testerOption: TesterOptions) {
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
        tests: preRunResponse?.tests || [],
        inMemEnvs: preRunResponse?.inMem || {},
        scriptError: preRunResponse?.scriptError || null
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
        var script: SandboxTestMessage = {
          type: 'postscript',
          script: $request.postscript,
          $request,
          $response
        };
        let postRunResponse: TestResponse = await this.tester.runScript(script, testerOption);
        $response.logs = [...$response.logs, ...postRunResponse.logs];
        $response.tests = [...$response.tests, ...postRunResponse.tests];
        $response.inMemEnvs = { ...$response.inMemEnvs, ...postRunResponse.inMem };
        if (postRunResponse.scriptError) {
          $response.scriptError = $response.scriptError ? $response.scriptError + '\n' + postRunResponse.scriptError : postRunResponse.scriptError;
        }
      }
      if(environment.PLATFORM === 'CHROME'){
        await ExtentionHelper.clearRestrictedHeaders();
      }
      resolve({ $request, $response })
    }
  }



  interpolateReq($request: CompiledApiRequest, originalReq: ApiRequest, options?: RunOption): CompiledApiRequest {
    const interpolationOpt: InterpolationOption = {}
    if (options?.hasOwnProperty('useInMemEnv')) interpolationOpt.useInMemEnv = options.useInMemEnv;
    if (options?.hasOwnProperty('useEnv')) interpolationOpt.useEnv = options.useEnv;


    let { url, headers, queryParams, body } = $request, bodyData;
    headers = this.interpolationService.interpolateObject(headers, interpolationOpt);
    queryParams = this.interpolationService.interpolateObject(queryParams, interpolationOpt);
    url = this.interpolationService.interpolate(this.prepareQueryParams(url, queryParams || {}), interpolationOpt);
    url = RequestUtils.checkForHTTP(url);
    if (METHOD_WITH_BODY.indexOf($request.method.toUpperCase()) >= 0 && $request.bodyType) {
      switch ($request.bodyType) {
        case 'x-www-form-urlencoded':
          body = this.interpolationService.interpolateObject(body, interpolationOpt);
          bodyData = Utils.getUrlEncodedXForm(body);
          break;
        case 'form-data':
          body = this.interpolationService.interpolateObject(body, interpolationOpt);
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
          let rawBody = this.interpolationService.interpolate(originalReq.Body.rawData, interpolationOpt);
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
          let bodyStr = JSON.stringify($request.body);
          bodyData = this.interpolationService.interpolate(bodyStr, interpolationOpt);
          try {
            body = JSON.parse(bodyData);
          } catch (e) {
            console.error(`Unable to convert request body to json`, e);
            body = $request.body;
          }
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

  async addHeadersFromObj(request:CompiledApiRequest) {
    
    let restrictedHeaders = {};
    for (let [key, val] of Utils.objectEntries(request.headers as { [key: string]: string })) {
      if (key) {
        var headerName = key.toUpperCase().trim();
        if ((RESTRICTED_HEADERS.includes(headerName) || headerName.startsWith('SEC-') || headerName.startsWith('PROXY-'))) {
            restrictedHeaders[key] = val;
        }else{
            try {
              this._xhr.setRequestHeader(key, val);
            } catch (e) {
              var m = e.message;
              console.warn(m.slice(m.indexOf(':') + 1).trim());
            }
        }
      }
    }
    if(Object.keys(restrictedHeaders).length>0 && environment.PLATFORM === 'CHROME'){
        let host = new URL(request.url).hostname;
        await ExtentionHelper.addRestrictedHeaders(restrictedHeaders, host)
    }
  };

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
    var size = resp.headers['content-length'];
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
