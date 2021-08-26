import { AuthService } from './../../../services/auth.service';
import { LoginComponent } from '../../login/login.component';
import { ApicRxStompState, StompService } from './../../../services/stomp.service';
import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { combineLatest } from 'rxjs';

@Component({
  selector: 'app-offline',
  templateUrl: './offline.component.html',
  styleUrls: ['./offline.component.css']
})
export class OfflineComponent implements OnInit {
  private ACCESS_DENIED: string = 'Access denied';
  offlineReason: string = '';
  constructor(private stompService: StompService, private dialog: MatDialog, private authService: AuthService, private router: Router) {

  }

  ngOnInit(): void {
    this.stompService.client.stompErrors$.subscribe(error => {
      if (error.body === this.ACCESS_DENIED) {
        this.offlineReason = 'UNAUTHORISED';
        this.stompService.client.deactivate()
      } else {
        this.offlineReason = 'OFFLINE';
      }
    });
    combineLatest([this.stompService.client.connectionChange$, this.router.events.pipe(filter(event => event instanceof NavigationEnd))])
      .subscribe(([status, event]) => {
        if ((status === ApicRxStompState.CONNECTING || status === ApicRxStompState.CLOSED) && this.router.url.includes('dashboard')) {
          this.offlineReason = 'OFFLINE';
        } else {
          this.offlineReason = '';
        }
      })

    this.stompService.client.connected$.subscribe(() => {
      this.offlineReason = ''
    })
  }

  openLoginModal() {
    this.dialog.open(LoginComponent,
      {
        disableClose: true,
        data: { action: 'login' },
        width: '100vw',
        height: '100vh', maxWidth: '100vw'
      });
  }

  logout() {
    this.authService.logout();
    this.offlineReason = '';
  }
}
