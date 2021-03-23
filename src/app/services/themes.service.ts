import { Injectable } from '@angular/core';
import LocalStore from './localStore';
import { Const } from '../utils/constants';
import helper from '../utils/helpers';


@Injectable({
  providedIn: 'root'
})
export class ThemesService {
  currentTheme: string;
  currentAccent: string;

  constructor() {
    let { themeType, themeAccent } = LocalStore.getMany([LocalStore.THEME_TYPE, LocalStore.THEME_ACCENT]);
    this.currentTheme = themeType ? themeType : 'dark';
    this.currentAccent = themeAccent ? themeAccent : Const.themes.accents[0];
  }

  switchTheme(themeType?: string, themeAccent?: string) {
    if (!themeType) themeType = this.currentTheme;
    if (!themeAccent) themeAccent = this.currentAccent;
    var root = document.documentElement;
    var themeData = Const.themes.types[themeType];
    for (const [key, val] of (helper.entries(themeData) as [string, any][])) {
      root.style.setProperty(key, val);
    }
    root.style.setProperty("--accent-color", themeAccent);
    root.style.setProperty("--accent-shadow", themeAccent + "4d");
    document
      .querySelector("meta[name=theme-color]")
      .setAttribute("content", themeData["--header-bg"]);

    LocalStore.setMany({ themeType, themeAccent });
    this.currentTheme = themeType;
    this.currentAccent = themeAccent;
  }

  applyCurrentTheme() {
    this.switchTheme();
  }
}
