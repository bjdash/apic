import { Component, OnInit } from '@angular/core';
import { ThemesService } from 'src/app/services/themes.service';
import { Const } from 'src/app/utils/constants';

@Component({
  selector: 'app-themes',
  templateUrl: './themes.component.html',
  styleUrls: ['./themes.component.css']
})
export class ThemesComponent implements OnInit {
  themes = Const.themes.types;
  accents = Const.themes.accents;
  constructor(private themesService: ThemesService) { }

  ngOnInit(): void {
  }

  switchTheme(themeType?: string, themeAccent?: string) {
    this.themesService.switchTheme(themeType, themeAccent);
  }
}
