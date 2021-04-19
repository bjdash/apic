import { Injectable } from '@angular/core';
import { ApiRequest } from '../models/Request.model';
import { Toaster } from './toaster.service';

export interface TestScript {
  type: 'prescript' | 'postscript',
  req: ApiRequest
}

@Injectable({
  providedIn: 'root'
})
export class TesterService {
  sandBox;
  constructor(private toaster: Toaster) {
    this.sandBox = document.getElementById('tester');
  };

  run(script: TestScript) {
    return new Promise((resolve, reject) => {
      window.addEventListener('message', (event) => {
        console.log('received response', event);
        resolve(event);
      }, { once: true });

      if (this.sandBox?.contentWindow) {
        this.sandBox.contentWindow.postMessage(script, '*');
      } else {
        console.error('Script runner sandbox not loaded');
      }
    })
  }
}
