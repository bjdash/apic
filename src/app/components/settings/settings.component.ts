import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent implements OnInit {
  settingsList: string[] = ['Themes', 'Web Client (CORS)'];
  selectedSetting: string[] = ['Themes'];

  constructor() { }

  ngOnInit(): void {
  }

  onSettingSelected(event) {

  }
}
