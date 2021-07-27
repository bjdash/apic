import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { environment } from 'src/environments/environment';
@Injectable({
  providedIn: 'root'
})
export class ElectronHandlerService {
  private _onElectronMessage = new Subject<any>();
  onElectronMessage$ = this._onElectronMessage.asObservable();

  constructor() {
    if (environment.PLATFORM === 'ELECTRON') {
      window.apicElectron.receive('electron-message', this.onMessageReceived.bind(this));
    }
  }

  sendMessage(type, message?) {
    console.log('sending message', type, message);

    window.apicElectron.send('electron-message', { type: type, message: message });
  }

  onMessageReceived(data) {
    if (!data) {
      console.error('Empty event.');
      return;
    }
    this._onElectronMessage.next(data);
  }
}
