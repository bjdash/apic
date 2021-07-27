import { Component, OnInit } from '@angular/core';
import { ElectronHandlerService } from 'src/app/services/electron-handler.service';

@Component({
  selector: 'app-update-downloaded',
  templateUrl: './update-downloaded.component.html',
  styleUrls: ['./update-downloaded.component.scss']
})
export class UpdateDownloadedComponent implements OnInit {

  constructor(
    private electronhandler: ElectronHandlerService
  ) { }

  ngOnInit(): void {
  }

  restart() {
    this.electronhandler.sendMessage('restart-apic');
  }
}
