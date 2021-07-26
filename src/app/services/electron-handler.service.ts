import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ElectronHandlerService {
  constructor() {
    if (environment.PLATFORM === 'ELECTRON') {
      window.apicElectron.receive('electron-message', this.onMessageReceived);
    }
  }

  sendMessage(type, message?) {
    window.apicElectron.send('electron-message', { type: type, message: message });
  }

  onMessageReceived(data) {
    console.log(data);
    if (!data) {
      console.error('Empty event.');
      return;
    }
    // switch (data.type) {
    //     case 'checking-for-update':
    //         console.info('checking-for-update');
    //         break;
    //     case 'update-not-available':
    //         $rootScope.closeUpdateFoundModal();
    //         toastr.info('Hooray!!! You are using the latest version of apic');
    //         break;
    //     case 'update-error':
    //         $rootScope.closeUpdateFoundModal();
    //         toastr.error('Couldn\'t check for update. Please try again later.');
    //         break;
    //     case 'update-available':
    //         console.info('Downloading update');
    //         break;
    //     case 'update-downloaded':
    //         $rootScope.closeUpdateFoundModal();
    //         $rootScope.openUpdatedModal();
    //         break;
    //     case 'download-progress':
    //         var percent = data.data.percent.toFixed(2);
    //         $('#download-progress-bar').css({
    //             width: +percent + '%'
    //         });
    //         $('#download-progress').text('Downloaded '
    //                 + percent
    //                 + '% ('
    //                 + (data.data.transferred > 1048576 ? ((data.data.transferred / 1048576).toFixed(2) + 'MB') : ((data.data.transferred / 1024).toFixed(2) + 'KB'))
    //                 + '/'
    //                 + (data.data.total > 1048576 ? ((data.data.total / 1048576).toFixed(2) + 'MB') : ((data.data.total / 1024).toFixed(2) + 'KB'))
    //                 + ') @ '
    //                 + (data.data.speedBPS > 1048576 ? ((data.data.speedBPS / 1048576).toFixed(2) + 'MB') : ((data.data.speedBPS / 1024).toFixed(2) + 'KB'))
    //                 + '/s');
    //         break;
    // }
  }
}
