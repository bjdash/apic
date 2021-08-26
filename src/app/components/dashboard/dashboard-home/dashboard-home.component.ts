import { Component, OnInit } from '@angular/core';
import { first } from 'rxjs/operators';
import { HttpService } from 'src/app/services/http.service';
import { Toaster } from 'src/app/services/toaster.service';

@Component({
  selector: 'app-dashboard-home',
  templateUrl: './dashboard-home.component.html',
  styleUrls: ['./dashboard-home.component.scss']
})
export class DashboardHomeComponent implements OnInit {
  flags = {
    loading: false,
  }
  dashData = {
    apiProjects: 0,
    publishedDocs: 0,
    reqs: 0,
    suits: 0
  }
  constructor(private toaster: Toaster, private http: HttpService) { }

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard() {
    this.flags.loading = true;
    this.http.getDashboard()
      .pipe(first())
      .subscribe(data => {
        this.dashData = data;
        this.flags.loading = false;
      }, () => {
        this.flags.loading = false;
      })
  }

}
