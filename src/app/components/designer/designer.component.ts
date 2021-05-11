import { NewApiProjectModal } from './newApiProject/newApiProject.modal.component';
import { Toaster } from '../../services/toaster.service';
import { ApiProject } from './../../models/ApiProject.model';
import { ApiProjectService } from './../../services/apiProject.service';
import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { Select } from '@ngxs/store';
import { MatDialog } from '@angular/material/dialog';
import { ImportProjectComponent } from './import-project/import-project.component';
import { ApiProjectStateSelector } from '../../state/apiProjects.selector';


@Component({
  selector: 'app-designer',
  templateUrl: './designer.component.html',
  styleUrls: ['./designer.component.css']
})
export class DesignerComponent implements OnInit {
  @Select(ApiProjectStateSelector.getPartial) projects$: Observable<ApiProject[]>;

  constructor(private apiProjectService: ApiProjectService, private toaster: Toaster, private dialog: MatDialog) { }

  ngOnInit(): void {
  }

  async openAddProject() {
    this.dialog.open(NewApiProjectModal);
  }

  showProjImport() {
    this.dialog.open(ImportProjectComponent);
  }

}
