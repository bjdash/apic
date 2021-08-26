import { KeyVal } from 'src/app/models/KeyVal.model';
import { Client, StompConfig } from '@stomp/stompjs';
import * as SockJS from "sockjs-client/dist/sockjs.min";

export interface StopSocketOption {
  login?: string
  passcode?: string
  headers?: KeyVal[],
  vhost?: string,
  subscUrl?: string
}
export class StompSocketService {
  client: Client;
  constructor(
    private url: string,
    private subscUrl: string,
    private headers: { [key: string]: string },
    private onConnect,
    private onDisconnect,
    private onMessage,
    private onError) { }

  connect() {
    this.client = new Client();
    let config: StompConfig = {
      connectionTimeout: 0,
      heartbeatOutgoing: 6000,
      heartbeatIncoming: 0,
      reconnectDelay: 0
    }
    if (this.url.indexOf('ws://') === 0 || this.url.indexOf('ws://') === 0) {
      config.brokerURL = this.url
    } else {
      config.webSocketFactory = () => {
        return new SockJS(this.url);
      }
    }
    config.connectHeaders = { ...this.headers };
    this.client.configure(config);
    this.client.onConnect = (frame) => {
      this.onConnect();
      this.client.subscribe(this.subscUrl, this.onMessage);
    };
    this.client.onDisconnect = this.onDisconnect;
    this.client.onStompError = this.onError;
    this.client.onWebSocketError = this.onError;
    this.client.activate();

  };

  disconnect() {
    if (this.client) {
      this.client.deactivate();
    }
  };

  send(q, headers, body) {
    this.client.publish({ destination: q, body, headers });
  };

  isConnected() {
    return this.client?.connected;
  }
}
