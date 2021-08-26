import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent implements OnInit {
  settingsList: string[] = ['Themes', 'Web Agent (CORS)'];
  selectedSetting: string[] = ['Themes'];
  showSaved = false;

  constructor(@Inject(MAT_DIALOG_DATA) public data: { selected: string },) {
    if (data?.selected) {
      this.selectedSetting = [data.selected]
    }
  }

  ngOnInit(): void {
  }

  onSettingSelected(event) {

  }

  saved() {
    this.showSaved = true;
    setTimeout(() => {
      this.showSaved = false;
    }, 3000);
  }
}
