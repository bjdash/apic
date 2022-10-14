import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ApicListItem, ApicListItemObj } from 'src/app/components/common/apic-list/apic-list.component';
import { KeyVal } from 'src/app/models/KeyVal.model';
import { InterpolationService } from 'src/app/services/interpolation.service';
import { Toaster } from 'src/app/services/toaster.service';
import { Utils } from 'src/app/services/utils.service';
import { RequestUtils } from 'src/app/utils/request.util';
import { io } from 'socket.io-client';
import { StompSocketService, StopSocketOption } from './stomp-socket.service';
import { MatDialog } from '@angular/material/dialog';
import { SaveReqDialogComponent } from '../../save-req-dialog/save-req-dialog.component';
import { ApiRequest } from 'src/app/models/Request.model';
import { from, Observable, Subject } from 'rxjs';
import { RequestsStateSelector } from 'src/app/state/requests.selector';
import { Store } from '@ngxs/store';
import { delayWhen, takeUntil } from 'rxjs/operators';
import { TesterTabsService } from '../tester-tabs.service';
import apic from 'src/app/utils/apic';
import { RequestsService } from 'src/app/services/requests.service';
import { TesterTabInterface } from '../tester-tabs.interface';

type Method = 'Websocket' | 'Stomp' | 'Socketio' | 'SSE';
interface SocketioForm {
  path: string,
  pooling: boolean,
  ws: boolean,
  listeners: ApicListItem[],
  headers: KeyVal[],
  query: KeyVal[],
  emitName: string
}
@Component({
  selector: 'app-tab-socket',
  templateUrl: './tab-socket.component.html',
  styleUrls: ['./tab-socket.component.scss']
})
export class TabSocketComponent implements OnInit, OnDestroy, TesterTabInterface {
  @Input() requestId: string;
  @Input() initialData: ApiRequest;
  form: FormGroup;
  selectedReq: ApiRequest;
  selectedReq$: Observable<ApiRequest>;
  private _destroy: Subject<boolean> = new Subject<boolean>();
  private pendingAction: Promise<any> = Promise.resolve(null);
  reloadRequest: ApiRequest = null;
  client: any;
  messages: { type: 'auto' | 'in' | 'out' | 'error', body: any, head?: any, time: number, headers?: any }[] = [];
  method: Method = 'Websocket';
  sseListenerFns = {};
  socketIo = {
    args: [''],
    argTypes: ['json'],
    curArg: 0,
  }

  flags = {
    showConnection: true,
    showMsgs: true,
    showSend: true,
    sendMsgType: 'json',
    connected: false,
    connecting: false,
    stompUseCred: false,
    stompShowPsd: false,
    sent: false
  }

  constructor(
    fb: FormBuilder,
    private dialog: MatDialog,
    private store: Store,
    private interpolationService: InterpolationService,
    private toastr: Toaster,
    private tabsService: TesterTabsService,
    private reqService: RequestsService
  ) {
    this.form = fb.group({
      name: [''],
      url: [''],
      sse: fb.group({
        listeners: [[{
          active: true,
          readonly: true,
          name: 'message'
        }]],
        withCred: [false]
      }),
      stomp: fb.group({
        subscUrl: [''],
        host: [''],
        login: [''],
        passcode: [''],
        headers: [[]],
        destQ: ['']
      }),
      socketio: fb.group({
        path: [''],
        pooling: [true],
        ws: [true],
        listeners: [[]],
        headers: [[]],
        query: [[]],
        emitName: [''],
      }),
      sendText: ['']
    })
  }
  ngOnDestroy(): void {
    this._destroy.next();
    this._destroy.complete();
  }

  ngOnInit(): void {
    if (!this.requestId.includes('new_tab') && !this.requestId.includes('suit_req')) {
      this.listenForUpdate()
    }
    if (this.initialData) {
      this.processSelectedReq(this.initialData)
    }
  }
  listenForUpdate() {
    this.selectedReq$ = this.store.select(RequestsStateSelector.getRequestByIdDynamic(this.requestId));
    this.selectedReq$
      .pipe(delayWhen(() => from(this.pendingAction)))
      .pipe(takeUntil(this._destroy))
      // .pipe(delay(0))
      .subscribe(req => {
        if (req && (req._modified > this.selectedReq?._modified || !this.selectedReq)) {
          if (this.selectedReq) {
            //TODO: Implement a field level matching logic
            //so that if any non form fields are updated such as name, savedResponse etc
            //then directly just update the request instead of asking the user if they want to reload
            this.reloadRequest = req;
          } else {
            setTimeout(() => {
              this.processSelectedReq(req)
            }, 0);
          }
        } else if (req == undefined && this.selectedReq) {
          //tab got deleted
          this.tabsService.updateTab(this.requestId, 'new_tab:' + apic.s8(), 'Deleted Tab: ' + this.selectedReq.name);
        }
      })
  }

  processSelectedReq(req: ApiRequest) {
    this.selectedReq = req;
    const { method, name, url, message } = req;

    this.method = method as Method;
    let patch: any = { name, url, sendText: message }
    switch (this.method) {
      case 'SSE':
        patch.sse = req.sse || {};
        this.form.patchValue(patch)
        break;
      case 'Stomp':
        patch.stomp = req.stomp;
        this.form.patchValue(patch)
        break;
      case 'Socketio':
        {
          let { args, argTypes, curArg, path, listeners, headers, query, emitName, transport } = req.socketio || {};
          this.socketIo = { ...this.socketIo, args: [...args], argTypes: [...argTypes], curArg };
          patch.socketio = {
            path,
            emitName,
            pooling: transport?.[0] || true,
            ws: transport?.[1] || true,
            listeners: listeners || [],
            headers: headers || [],
            query: query || [],
          };
          this.form.patchValue(patch);
          if (args?.length > 0) {
            this.sioLoadArgVal(0);
          }
        }
        break;
      case 'Websocket':
        this.form.patchValue(patch);
        break;
    }

  }

  connect() {
    var url = this.interpolationService.interpolate(this.form.value.url);
    if (!url) {
      this.toastr.error('Please specify a valid URL to connect to.');
      return;
    }
    this.flags.connecting = true;
    if (this.method === 'Websocket') {
      if (!url || (url.indexOf('ws://') !== 0 && url.indexOf('wss://') !== 0)) {
        this.toastr.error('The specified URL is not a valid Websocket URL');
        this.flags.connecting = false;
        return;
      }
      this.client = new WebSocket(url);
      this.client.onopen = (evt) => {
        this.onConnect();
      };
      this.client.onclose = this.onDisconnect.bind(this);
      this.client.onmessage = this.onSocketMessage.bind(this);//function(evt) { onMessage(evt) };
      this.client.onerror = this.onError.bind(this);
    } else if (this.method === 'SSE') {
      url = RequestUtils.checkForHTTP(url);
      this.client = new EventSource(url, { withCredentials: this.form.value.sse.withCred });
      this.client.onmessage = function (event) {
        console.log(event);
      }

      this.client.addEventListener('open', (e) => {
        this.onConnect();
        this.onSseConnect();
      }, false);

      this.client.addEventListener('error', (e) => {
        if (e.readyState == EventSource.CLOSED) {
          this.onDisconnect();
        } else {
          this.onError(e);
        }
      }, false);
    } else if (this.method === 'Socketio') {
      let socketioOpt: SocketioForm = this.form.value.socketio;
      var path = this.interpolationService.interpolate(socketioOpt.path) || '/socket.io';
      var option: any = {
        path: path,
        reconnection: false
      }
      if (socketioOpt.query.length > 0) {
        var query = this.interpolationService.interpolateObject(Utils.keyValPairAsObject(socketioOpt.query.filter(q => q.active)));
        if (Object.keys(query).length > 0) {
          option.query = query;
        }
      }
      var transport = [];
      if (socketioOpt.pooling) transport.push('polling');
      if (socketioOpt.ws) transport.push('websocket');
      if (transport.length > 0) {
        option.transports = transport;
      }
      if (transport.indexOf('pooling') >= 0 && socketioOpt.headers.length > 0) {
        var headers = this.interpolationService.interpolateObject(Utils.keyValPairAsObject(socketioOpt.headers.filter(q => q.active)));;
        if (Object.keys(headers).length > 0) {
          option.transportOptions = {
            extraHeaders: headers
          }
        }
      }
      this.client = io(url, option);
      this.client.on('connect', () => {
        this.onConnect();
        this.onSioConect();
      });
      this.client.on('error', this.onError.bind(this));
      this.client.on('connect_error', this.onError.bind(this));
      this.client.on('disconnect', this.onDisconnect.bind(this));
    } else if (this.method === 'Stomp') {
      this.client = new StompSocketService(
        url,
        this.interpolationService.interpolate(this.form.value.stomp.subscUrl),
        this.getStompHeaders(),
        this.onConnect.bind(this),
        this.onDisconnect.bind(this),
        this.onStompMessage.bind(this),
        this.onError.bind(this)
      );
      this.client.connect();
    }
  }

  disconnect() {
    if (this.client) {
      if (this.method === 'Stomp') {
        if (this.client.isConnected()) {
          this.client.disconnect();
        } else {
          this.onDisconnect();
        }
      } else if (this.method === 'Socketio') {
        if (this.client.connected) {
          this.client.disconnect();
        } else {
          this.onDisconnect();
        }
      } else if (this.method === 'SSE') {
        this.client.close();
        this.sseListenerFns = {};
        this.onDisconnect();
      } else {
        this.client.close();
      }
    } else {
      this.flags.connected = false;
      this.flags.connecting = false;
    }
  }

  onConnect() {
    this.flags.connecting = false;
    this.flags.connected = true;
    this.messages = [{
      type: 'auto',
      body: this.method + ' connected.',
      time: Date.now()
    }];
  }
  onSseConnect() {
    let listeners: ApicListItemObj[] = this.form.value.sse.listeners;
    listeners?.forEach(l => {
      if (l.active) this.wsAddListener(l, 'sse');
    })
  }

  onSioConect() {
    let listeners: ApicListItemObj[] = this.form.value.socketio.listeners;
    listeners?.forEach(l => {
      if (l.active) this.wsAddListener(l, 'socketio');
    })
  }

  onDisconnect() {
    this.flags.connected = false;
    this.flags.connecting = false;
    this.client = null;
    this.messages.push({
      type: 'auto',
      body: 'Client disconnected.',
      time: Date.now()
    })
    // try {
    //     $rootScope.safeApply();
    // } catch (e) { }
  }

  onSocketMessage(e) {

    let body: any;
    try {
      body = JSON.parse(e.data);
    } catch (err) {
      body = e.data;
    }
    this.messages.push({
      type: 'in',
      body,
      time: Date.now()
    });
  }

  onSseMessage(e, listener) {
    let body;
    try {
      body = JSON.parse(e.data);
    } catch (err) {
      body = e.data;
    }
    this.messages.push({
      head: listener,
      type: 'in',
      time: Date.now(),
      body
    });
  }
  onSioMessage(message, listener) {
    let body;
    if (typeof message === 'object') {
      body = message
    } else {
      try {
        body = JSON.parse(message);
      } catch (err) {
        body = message;
      }
    }
    this.messages.push({
      head: listener,
      type: 'in',
      body,
      time: Date.now()
    });
  }
  onStompMessage(message) {
    let body;
    try {
      body = JSON.parse(message.body);
    } catch (e) {
      body = message.body;
    }
    this.messages.push({
      headers: message.headers,
      type: 'in',
      body,
      time: Date.now()
    });
  }

  onError(e) {
    this.flags.connected = false;
    this.flags.connecting = false;
    this.client = null;
    let body;
    try {
      body = JSON.parse(e.body || e.message);
    } catch (err) {
      body = e.body || e.message || 'Unknown error';
    }
    this.messages.push({
      type: 'error',
      body,
      headers: e.headers,
      time: Date.now()
    });
    this.toastr.error(`Connection failed. Error:${body}`)
  }

  wsAddListener(listener: ApicListItemObj, type: 'socketio' | 'sse') {
    if (this.client) {
      let name = this.interpolationService.interpolate(listener.name);;
      switch (type) {
        case 'socketio':
          this.client.on(name, (message) => {
            this.onSioMessage(message, name);
          })
          break;
        case 'sse':
          if (this.sseListenerFns[name]) {
            this.toastr.error('Already listening for this event')
            return;
          }

          this.sseListenerFns[name] = (e) => {
            this.onSseMessage(e, name);
          };
          this.client.addEventListener(name, this.sseListenerFns[name], false);
          break;
      }
      this.messages.push({
        type: 'auto',
        body: 'Started listening for ' + name + ' events.',
        time: Date.now()
      })
    }
  }

  wsRemoveListener(listener: ApicListItemObj, type: 'socketio' | 'sse') {
    let name = this.interpolationService.interpolate(listener.name);
    if (this.client) {
      switch (type) {
        case 'socketio':
          this.client.off(name);
          break;
        case 'sse':
          this.client.removeEventListener(name, this.sseListenerFns[name]);
          delete this.sseListenerFns[name];
          break;
      }
      this.messages.push({
        type: 'auto',
        body: 'Stopped listening for all ' + name + ' events.',
        time: Date.now()
      })
    }
  }

  wsToggleListener(listener: ApicListItemObj, type: 'socketio' | 'sse') {
    if (listener.active) this.wsAddListener(listener, type);
    else this.wsRemoveListener(listener, type);
  }

  send() {
    if (!this.client) {
      this.toastr.error('It looks like you are not connected.');
      return;
    }
    let form = this.form.value;
    var sendData = this.interpolationService.interpolate(form.sendText);
    if (this.method === 'Stomp') {
      this.client.send(this.interpolationService.interpolate(this.form.value.stomp.destQ), {}, sendData);
      this.sent(sendData);
    } else if (this.method === 'Socketio') {
      this.sioSaveCurrentArg();
      var argsToSend = this.socketIo.args.map((text, index) => {
        var iText = this.interpolationService.interpolate(text);
        return this.socketIo.argTypes[index] === 'json' ? JSON.parse(iText) : iText;
      });
      var emitName = this.interpolationService.interpolate(this.form.value.socketio.emitName);
      this.client.emit.apply(this.client, [emitName].concat(argsToSend));
      if (argsToSend.length === 1) {
        this.sent(argsToSend[0], emitName)
      } else {
        this.sent(argsToSend, emitName + ' [' + argsToSend.length + ' arguments]');
      }
    } else {
      try {
        this.client.send(sendData);
        this.sent(sendData);
      } catch (e) {
        this.toastr.error(e.message);
      }
    }
  }

  sent(msg, head?) {
    this.messages.push({
      head: head,
      body: msg,
      type: 'out',
      time: Date.now()
    })
    this.flags.sent = true;
    setTimeout(() => {
      this.flags.sent = false;
    }, 3000);
  }

  async initReqSave(saveAs: boolean = false) {
    let saveData: ApiRequest = this.getReqFromForm();
    if (this.requestId.includes('new_tab') || saveAs) {
      this.dialog.open(SaveReqDialogComponent, { data: { req: saveData, action: (saveAs ? 'saveAs' : 'new') }, width: '600px' });
    } else {
      await this.updateRequest(saveData);
    }
  }

  getReqFromForm(): ApiRequest {
    const type: 'ws' = 'ws';
    const { url, sendText, name, sse, stomp, socketio } = this.form.value;
    switch (this.method) {
      case 'Stomp':
        return {
          _id: this.requestId,
          name,
          url,
          type,
          method: this.method,
          stomp,
          message: sendText
        };
      case 'Websocket':
        return {
          _id: this.requestId,
          name,
          url,
          type,
          method: this.method,
          message: sendText
        }
      case 'Socketio':
        this.sioSaveCurrentArg();
        const { path, pooling, ws, listeners, headers, query, emitName } = socketio
        return {
          _id: this.requestId,
          name,
          url,
          type,
          method: this.method,
          socketio: { ...Utils.clone(this.socketIo), path, listeners, headers, query, emitName, transport: [pooling, ws] }
        }
      case 'SSE':
        return {
          _id: this.requestId,
          name,
          url,
          type,
          method: this.method,
          sse
        }
      // default: return null;
    }
  }
  async updateRequest(updatedRequest: ApiRequest) {
    updatedRequest = { ...this.selectedReq, ...updatedRequest }
    this.pendingAction = this.reqService.updateRequest(updatedRequest);
    try {
      this.selectedReq = (await this.pendingAction)[0];
      this.toastr.success('Request updated.');
      this.reloadRequest = null;
    } catch (e) {
      console.error(e)
      this.toastr.error(`Failed to update request: ${e.message}`);
    }
  }

  copyCompiledUrl() {

  }

  sioAddArg() {
    this.sioSaveCurrentArg();
    this.socketIo.args.push('');
    this.socketIo.argTypes.push('json');
    this.socketIo.curArg = this.socketIo.args.length - 1;
    this.sioLoadArgVal(this.socketIo.curArg);
  }

  sioSaveCurrentArg() {
    this.socketIo.args[this.socketIo.curArg] = this.form.value.sendText;
    this.socketIo.argTypes[this.socketIo.curArg] = this.flags.sendMsgType;
  }

  sioLoadArgVal(index) {
    this.form.patchValue({ sendText: this.socketIo.args[index] })
    this.flags.sendMsgType = this.socketIo.argTypes[index];
    this.socketIo.curArg = index;
  }

  sioRemoveArg(index, eve) {
    eve.stopPropagation();
    this.socketIo.args.splice(index, 1);
    this.socketIo.argTypes.splice(index, 1);
    if (index === this.socketIo.curArg) {
      this.sioLoadArgVal(0);
      return;
    }
    if (index < this.socketIo.curArg) {
      this.socketIo.curArg--;
    }
  }
  getStompHeaders(): { [key: string]: string } {
    let { host, login, passcode, headers }: { host: string, login: string, passcode: string, headers: KeyVal[] } = this.form.value.stomp;
    let sHeaders = { host, login, passcode, ...(Utils.keyValPairAsObject(headers)) };

    return this.interpolationService.interpolateObject(sHeaders);
  }
  reload() {
    this.processSelectedReq(this.reloadRequest)
    this.reloadRequest = null
  }

  trackByFn(index, item) {
    return index;
  }
}
