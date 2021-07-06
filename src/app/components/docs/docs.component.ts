import { Component, OnInit } from '@angular/core';
import { Select } from '@ngxs/store';
import { Observable } from 'rxjs';
import { ApiProject } from 'src/app/models/ApiProject.model';
import { ApiProjectStateSelector } from 'src/app/state/apiProjects.selector';

@Component({
  selector: 'app-docs',
  templateUrl: './docs.component.html'
})
export class DocsComponent implements OnInit {
  @Select(ApiProjectStateSelector.getPartial) projects$: Observable<ApiProject[]>;

  constructor() { }

  ngOnInit(): void {
  }

}
