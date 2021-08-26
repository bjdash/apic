import { Component, OnInit } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ThemesService } from 'src/app/services/themes.service';
import { LoginComponent } from '../login/login.component';

@Component({
  selector: 'app-intro',
  templateUrl: './intro.component.html',
  styleUrls: ['./intro.component.scss']
})
export class IntroComponent implements OnInit {
  slide = 0;
  selectedTheme: string = 'dark'

  constructor(
    private themesService: ThemesService,
    private dialog: MatDialog,
    private dialogRef: MatDialogRef<IntroComponent>
  ) { }

  ngOnInit(): void {
    this.selectedTheme = this.themesService.currentTheme;
  }

  switchTheme(themeType?: string, themeAccent?: string) {
    this.selectedTheme = themeType;
    this.themesService.switchTheme(themeType, themeAccent);
  }

  openAuthModal() {
    this.dialog.open(LoginComponent,
      {
        disableClose: true,
        data: { action: 'login' },
        width: '100vw',
        height: '100vh', maxWidth: '100vw'
      });
  }
  closeIntroModal() {
    this.dialogRef.close();
  }
}
