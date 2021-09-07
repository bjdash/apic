import { Injectable } from '@angular/core';
import { BehaviorSubject, config } from 'rxjs';
import io from 'socket.io-client';
import { ApiRequest } from '../models/Request.model';
import { RunResult } from '../models/RunResult.model';
import { AGENT_DEFAULT_CONF } from '../utils/constants';
import LocalStore from './localStore';
import { Toaster } from './toaster.service';
import { Utils } from './utils.service';

export type ApicAgentStatus = 'offline' | 'online' | 'connecting';
export interface ApicAgentConfig { port: number, timeoutMs: number }
@Injectable({
  providedIn: 'root'
})
export class ApicAgentService {
  status$: BehaviorSubject<ApicAgentStatus> = new BehaviorSubject('offline');
  agent: any;
  config: ApicAgentConfig = AGENT_DEFAULT_CONF;

  constructor(private toaster: Toaster) {
    this.refreshSavedCofig();
  }

  connect() {
    this.status$.next('connecting');
    this.agent = io(`http://localhost:${this.config.port}`, {
      path: "/apic-agent",
      reconnection: false
    });
    this.agent.on('connect', () => {
      this.status$.next('online')
    });
    this.agent.on('error', (e) => {
      this.toaster.error(`Failed to connect to APIC agent on port ${this.config.port}. ${e}`);
      this.status$.next('offline')
    });
    this.agent.on('connect_error', (e) => {
      this.status$.next('offline');
      this.toaster.error(`Failed to connect to APIC agent on port ${this.config.port}. ${e}`)
    });
    this.agent.on('disconnect', () => {
      this.status$.next('offline');
      this.toaster.info('APIC agent disconnected.');
    });
  }
  disconnect() {
    if (this.isOnline()) {
      this.agent.disconnect();
    }
  }

  isOnline() {
    return this.agent?.connected
  }

  runRequest(request: ApiRequest, envs: { saved: { [key: string]: string }, inMem: { [key: string]: string } }): Promise<RunResult> {
    return new Promise((resolve, reject) => {
      let timeout = setTimeout(() => {
        reject({ message: `Timed-out. Didnt receive any response from APIC agent in ${Utils.formatTime(120000)}` })
      }, this.config.timeoutMs);
      this.agent.once("RUN_REQUEST_DONE", (result) => {
        resolve(result);
        clearTimeout(timeout);
      });
      this.agent.emit('RUN_REQUEST', { request, envs })
    })
  }

  refreshSavedCofig(): ApicAgentConfig {
    let agentConfig = LocalStore.get(LocalStore.WEB_AGENT);
    if (agentConfig) {
      try {
        this.config = JSON.parse(agentConfig)
      } catch (error) {
        console.log(`Failed to parse saved web agent config.`, error);
      }
    }
    return this.config;
  }

  saveConfig(config: ApicAgentConfig) {
    this.config = config;
    LocalStore.set(LocalStore.WEB_AGENT, JSON.stringify(config))
  }
}
