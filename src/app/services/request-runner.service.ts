import { Injectable } from '@angular/core';
import { CompiledApiRequest } from '../models/CompiledRequest.model';
import { KeyVal } from '../models/KeyVal.model';
import { ApiRequest } from '../models/Request.model';
import apic from '../utils/apic';
import { METHOD_WITH_BODY, RESTRICTED_HEADERS } from '../utils/constants';
import { InterpolationService } from './interpolation.service';
import { TesterService, TestScript } from './tester.service';
import { Utils } from './utils.service';

export interface RunResponse {
  headersStr?: string, // not available in apic-cli
  headers: { [key: string]: any; },
  status: number,
  statusText: string,
  readyState?: number,
  body: string,
  bodyPretty?: string,
  data: any,//json body
  timeTaken: number,
  timeTakenStr: string,
  respSize: string,
  logs: string
}

export interface RunResult {
  req: CompiledApiRequest,
  resp: RunResponse
}

@Injectable({
  providedIn: 'root'
})
export class RequestRunnerService {
  private _xhr: XMLHttpRequest;
  private sentTime: number;

  constructor(
    private tester: TesterService,
    private interpolationService: InterpolationService
  ) {
    this.onreadystatechange = this.onreadystatechange.bind(this)
  }

  run(req: ApiRequest): Promise<RunResult> {
    return new Promise(async (resolve, reject) => {
      let compiledReq: CompiledApiRequest = this.prepareRequestForRun(req);
      console.log(req, compiledReq);
      if (req.prescript) {
        var script: TestScript = {
          type: 'prescript',
          req: req
        };
        await this.tester.run(script);//TODO:
      }

      this._xhr = new XMLHttpRequest();
      this._xhr.open(compiledReq.method, compiledReq.url, true);

      this.addHeadersFromObj(compiledReq.headers);
      this._xhr.onreadystatechange = (event) => {
        this.onreadystatechange(event, compiledReq, resolve)
      };

      this.sentTime = Date.now();
      if (compiledReq.body) {
        //TODO
        // req.request.body = Utils.getReqBody(BODY, req.request.bodyMeta.type);
        this._xhr.send(compiledReq.body);
      } else {
        // req.request.body = {};
        this._xhr.send();
      }
    });
  }

  onreadystatechange(event, req: CompiledApiRequest, resolve) {
    if (event.target.readyState === 4) {
      //calculating time taken
      var respTime = new Date().getTime();
      var timeDiff = respTime - this.sentTime;
      var target = event.target;
      var headerStr = target.getAllResponseHeaders();
      var respObj: RunResponse = {
        headersStr: headerStr, // not available in apic-cli
        headers: Utils.prepareHeadersObj(headerStr),
        status: target.status,
        statusText: target.statusText,
        readyState: target.readyState,
        body: target.response,
        respSize: 'Unknown',
        timeTaken: timeDiff,
        timeTakenStr: timeDiff >= 1000 ? (timeDiff / 1000) + ' s' : timeDiff + ' ms',
        data: null,
        logs: 'Logs can be added in PreRun/PostRun scripts with "log()" function. Eg: log($response)',//TODO
      };
      respObj.respSize = this.getResponseSize(respObj)
      //convert response to json object
      var jsonResp: any = undefined;
      try {
        jsonResp = JSON.parse(respObj.body);
      } catch (e) {
        console.info('The response cant be converted to JSON');
      }
      if (jsonResp) {
        respObj.data = jsonResp;
      }

      resolve({ req, resp: respObj })
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

    }
  }

  prepareRequestForRun(req: ApiRequest): CompiledApiRequest {
    const { _id, url, method, prescript, postscript } = req;
    let newReq: CompiledApiRequest = { _id, url, method, prescript, postscript };

    //interpolating URL
    newReq.url = this.checkForHTTP(this.interpolationService.interpolate(newReq.url));


    //interpolate query params
    let queryParams = req.Req.url_params
      ?.filter(qp => qp.key && qp.active)
      ?.map(qp => {
        return {
          key: this.interpolationService.interpolate(qp.key),
          val: this.interpolationService.interpolate(qp.val),
          active: qp.active
        }
      })
    newReq.url = this.prepareQueryParams(newReq.url, queryParams || []);

    //interpolating header key and values
    let headersList = req.Req.headers
      ?.filter(h => h.key && h.active)
      ?.map(qp => {
        return {
          key: this.interpolationService.interpolate(qp.key),
          val: this.interpolationService.interpolate(qp.val),
          active: qp.active
        }
      });
    newReq.headers = {
      ...Utils.keyValPairAsObject(headersList),
      'X-APIC-REQ-ID': apic.s8() + '-' + apic.s8(),
      'Content-Type': ''
    }

    //Prepare body to be sent with the request
    if (METHOD_WITH_BODY.indexOf(req.method) >= 0 && req.Body) {
      switch (req.Body.type) {
        case 'x-www-form-urlencoded':
          //interpolating x-www-form-urlencoded form data (key and values)
          if (req.Body?.xForms) {
            let xForms = req.Body.xForms.filter(xf => xf.key && xf.active)
              .map(xf => {
                return {
                  active: xf.active,
                  key: this.interpolationService.interpolate(xf.key),
                  val: this.interpolationService.interpolate(xf.val)
                }
              })
            newReq.body = Utils.getUrlEncodedBody(xForms);
          }
          newReq.headers['Content-Type'] = 'application/x-www-form-urlencoded';
          break;
        case 'raw':
          // interpolating raw body data
          let rawBody = this.interpolationService.interpolate(req.Body.rawData);
          newReq.body = rawBody;
          newReq.headers['Content-Type'] = req.Body.selectedRaw.val;
          break;
        case 'graphql':
          //TODO://interpolating graphql (key and values)
          req.Body.type = 'raw';
          newReq.body = Utils.getGqlBody(req.Body.rawData, req.Body.gqlVars);
          newReq.headers['Content-Type'] = 'application/json';
          break;
        case 'form-data':
          //interpolating form data (key and values)//TODO: handle input type file
          newReq.body = Utils.getFormDataBody(req.Body.formData);
          break;
      }
    }

    return newReq;
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

  prepareQueryParams(url: string, params: KeyVal[]): string {
    if (!params?.length) return url;
    var queryString = params
      .filter(p => p.key && p.active)
      .map(p => encodeURIComponent(p.key) + '=' + encodeURIComponent(p.val));

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
}
