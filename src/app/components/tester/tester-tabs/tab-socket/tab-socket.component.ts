import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ApicListItem } from 'src/app/components/common/apic-list/apic-list.component';
import { KeyVal } from 'src/app/models/KeyVal.model';
import { InterpolationService } from 'src/app/services/interpolation.service';
import { Toaster } from 'src/app/services/toaster.service';
import { Utils } from 'src/app/services/utils.service';
import { RequestUtils } from 'src/app/utils/request.util';
// import { io } from "socket.io-client";
import io from 'socket.io-client';

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
export class TabSocketComponent implements OnInit {
  form: FormGroup;
  messages: { type: 'auto' | 'in' | 'out' | 'error', body: any, head?: any, time: number }[] = [];
  method: 'Websocket' | 'Stomp' | 'Socketio' | 'SSE' = 'Socketio';
  client: any;
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
    private interpolationService: InterpolationService,
    private toastr: Toaster
  ) {
    this.form = fb.group({
      url: ['http://socketio-chat-h9jt.herokuapp.com/'],
      sse: fb.group({
        listeners: [[{
          isActive: true,
          isReadonly: true,
          name: 'message'
        }]],
        withCred: [false]
      }),
      stomp: fb.group({
        subscUrl: [''],
        vhost: [''],
        loginId: [''],
        psd: [''],
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

  ngOnInit(): void {
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
      this.client.on('disconnect', this.onDisconnect.bind(this));
    }
  }

  disconnect() {
    if (this.client) {
      if (this.method === 'Stomp') {
        this.client.disconnect();
        //TODO: Handle disconnect via event
        this.onDisconnect();
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
    console.log('connected');
    this.flags.connecting = false;
    this.flags.connected = true;
    this.messages = [{
      type: 'auto',
      body: this.method + ' connected.',
      time: Date.now()
    }];
  }
  onSseConnect() {
    let listeners: ApicListItem[] = this.form.value.sse.listeners;
    listeners?.forEach(l => {
      if (l.isActive) this.wsAddListener(l, 'sse');
    })
  }

  onSioConect() {
    let listeners: ApicListItem[] = this.form.value.socketio.listeners;
    listeners?.forEach(l => {
      if (l.isActive) this.wsAddListener(l, 'socketio');
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
      head: e.headers,
      time: Date.now()
    });
  }

  wsAddListener(listener: ApicListItem, type: 'socketio' | 'sse') {
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

  wsRemoveListener(listener: ApicListItem, type: 'socketio' | 'sse') {
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

  wsToggleListener(listener: ApicListItem, type: 'socketio' | 'sse') {
    if (listener.isActive) this.wsAddListener(listener, type);
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
      // this.client.send(this.interpolationService.interpolate(this.destQ), {}, sendData);
      // sent(sendData);
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

  initReqSave(saveas?) {

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

  trackByFn(index, item) {
    return index;
  }
}
