import { Injectable } from '@angular/core';
import { Select, Store } from '@ngxs/store';
import { Observable } from 'rxjs';
import { EnvsAction } from '../actions/envs.action';
import { CompiledApiRequest } from '../models/CompiledRequest.model';
import { ParsedEnv } from '../models/Envs.model';
import { TestResponse } from '../models/TestResponse.model';
import { SandboxSchemaValidationResponse, SandboxTestMessage } from '../models/Sandbox.model';
import { EnvState } from '../state/envs.state';
import { Toaster } from './toaster.service';
import { Utils } from './utils.service';
import { SandboxEvent } from '../models/Sandbox.model';

export interface TesterOptions {
  skipinMemUpdate?: boolean
}

@Injectable({
  providedIn: 'root'
})
export class SandboxService {
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

  runScript(script: SandboxTestMessage, options?: TesterOptions): Promise<TestResponse> {
    return new Promise((resolve, reject) => {
      if (this.sandBox?.contentWindow) {
        window.addEventListener('message', (event: MessageEvent) => {
          this.runScriptMessageListener(event.data, resolve, options);
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
        let message: SandboxEvent = {
          type: 'TestMessage',
          payload: script
        }
        this.sandBox.contentWindow.postMessage(message, '*');
      } else {
        console.error('Script runner sandbox not loaded');
      }
    })
  }

  runScriptMessageListener(event: TestResponse, resolve, options: TesterOptions) {
    let updatedInMem = event.inMem;
    if (Utils.objectEntries(this.inMemEnv).toString() !== Utils.objectEntries(updatedInMem).toString() && !options?.skipinMemUpdate) {
      this.store.dispatch(new EnvsAction.SetInMem(updatedInMem))
    }
    resolve(event);
  }

  validateSchema(schema, data) {
    return new Promise<boolean>((resolve, reject) => {
      if (this.sandBox?.contentWindow) {
        window.addEventListener('message', (event: MessageEvent) => {
          this.validateSchemaMessageListener(event.data, resolve);
        }, { once: true });

        
        let message: SandboxEvent = {
          type: 'SchemaValidationMessage',
          payload: {
            schema,
            data
          }
        }
        this.sandBox.contentWindow.postMessage(message, '*');
      } else {
        console.error('Script runner sandbox not loaded');
      }
    })
  }

  validateSchemaMessageListener(isValid:SandboxSchemaValidationResponse, resolve){
    if(isValid.valid){
      resolve(true)
    }else{
      console.warn(isValid.error);
      resolve(false)
    }
  }
}
