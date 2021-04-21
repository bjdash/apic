import { Injectable } from '@angular/core';
import { Select, Store } from '@ngxs/store';
import { Observable } from 'rxjs';
import { EnvsAction } from '../actions/envs.action';
import { CompiledApiRequest } from '../models/CompiledRequest.model';
import { ParsedEnv } from '../models/Envs.model';
import { TestResponse } from '../models/TestResponse.model';
import { TestScript } from '../models/TestScript.model';
import { EnvState } from '../state/envs.state';
import { Toaster } from './toaster.service';
import { Utils } from './utils.service';


@Injectable({
  providedIn: 'root'
})
export class TesterService {
  @Select(EnvState.getSelected) selectedEnv$: Observable<ParsedEnv>;
  @Select(EnvState.getInMemEnv) inMemEnv$: Observable<{ [key: string]: string }>;

  sandBox;
  selectedEnv: ParsedEnv;
  inMemEnv: { [key: string]: any } = {};

  constructor(private toaster: Toaster, private store: Store) {
    this.sandBox = document.getElementById('tester');
    this.selectedEnv$.subscribe(val => {
      this.selectedEnv = val
    })
    this.inMemEnv$.subscribe(val => {
      this.inMemEnv = val
    })
  };

  runScript(script: TestScript): Promise<TestResponse> {
    return new Promise((resolve, reject) => {
      if (this.sandBox?.contentWindow) {
        window.addEventListener('message', (event: MessageEvent) => {
          this.onMessageListener(event.data, resolve);
        }, { once: true });

        script.envs = {
          saved: { ...this.selectedEnv?.vals },
          inMem: { ...this.inMemEnv }
        }
        // let scriptToTun:TestScript = {}
        if (script.$request?.bodyData) {
          let { bodyData, ...rest } = script.$request;
          script.$request = rest;
        }
        this.sandBox.contentWindow.postMessage(script, '*');
      } else {
        console.error('Script runner sandbox not loaded');
      }
    })
  }

  onMessageListener(event: TestResponse, resolve) {
    console.log('received response', event, this.inMemEnv);
    let updatedInMem = event.inMem;
    if (Utils.objectEntries(this.inMemEnv).toString() !== Utils.objectEntries(updatedInMem).toString()) {
      this.store.dispatch(new EnvsAction.SetInMem(updatedInMem))
    }
    resolve(event);
  }
}
