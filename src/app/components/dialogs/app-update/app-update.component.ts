import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ElectronHandlerService } from 'src/app/services/electron-handler.service';
import { Toaster } from 'src/app/services/toaster.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-app-update',
  templateUrl: './app-update.component.html',
  styleUrls: ['./app-update.component.scss']
})
export class AppUpdateComponent implements OnInit, OnDestroy {
  currVer = environment.VERSION;
  platform = environment.PLATFORM;
  os: string = window.apicElectron?.osType;

  private _destroy = new Subject<boolean>();
  flags = {
    downloading: false
  }
  constructor(
    private toastr: Toaster,
    private electronhandler: ElectronHandlerService,
    private dialogRef: MatDialogRef<AppUpdateComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { newVer: string, changeLog: string[] }
  ) { }

  ngOnDestroy(): void {
    this._destroy.next();
    this._destroy.complete();
  }

  ngOnInit(): void {
    this.electronhandler.onElectronMessage$.pipe(takeUntil(this._destroy))
      .subscribe(data => {
        switch (data.type) {
          case 'update-not-available':
            this.dialogRef?.close()
            break;
          case 'update-error':
            this.dialogRef?.close()
            break;
          case 'update-downloaded':
            this.dialogRef?.close();
            break;
          case 'download-progress':
            var percent = data.data.percent.toFixed(2);
            document.getElementById('update-download-progress').style.width = percent + '%';
            document.getElementById('download-progress').innerText = ('Downloaded '
              + percent
              + '% ('
              + (data.data.transferred > 1048576 ? ((data.data.transferred / 1048576).toFixed(2) + 'MB') : ((data.data.transferred / 1024).toFixed(2) + 'KB'))
              + '/'
              + (data.data.total > 1048576 ? ((data.data.total / 1048576).toFixed(2) + 'MB') : ((data.data.total / 1024).toFixed(2) + 'KB'))
              + ') @ '
              + (data.data.speedBPS > 1048576 ? ((data.data.speedBPS / 1048576).toFixed(2) + 'MB') : ((data.data.speedBPS / 1024).toFixed(2) + 'KB'))
              + '/s');
            break;
        }
      })
  }

  downloadUpdate() {
    this.flags.downloading = true;
    if (this.platform === 'ELECTRON') {
      if (this.os?.toLowerCase() === 'darwin') {
        //macOS requires signed certificate for auto update to work, so for mac just download the dmg
        if (window.apicElectron.electron.shell) {
          window.apicElectron.electron.shell.openExternal('https://apic.app/download/apic-' + this.data.newVer + '.dmg');
          window.apicElectron.electron.shell.openExternal(`https://github.com/bjdash/apic/releases/download/v${this.data.newVer}/apic-${this.data.newVer}.dmg`);
          this.flags.downloading = false;
          this.toastr.info("Your download has been started..");
          this.dialogRef.close()
          return;
        }
      } else {
        this.electronhandler.sendMessage('check-for-update');
      }
    } else if (this.platform === "CHROME") {
      this.toastr.info("Chrome app updates are handled by Chrome internally.");
      this.dialogRef.close()
    } else {
      window.location.reload();
    }
  }
}
