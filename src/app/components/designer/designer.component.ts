import { NewApiProjectModal } from './newApiProject/newApiProject.modal.component';
import { Toaster } from '../../services/toaster.service';
import { ApiProject } from './../../models/ApiProject.model';
import { ApiProjectService } from './../../services/apiProject.service';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { Select, Store } from '@ngxs/store';
import { MatDialog } from '@angular/material/dialog';
import { ImportProjectComponent } from './import-project/import-project.component';
import { ApiProjectStateSelector } from '../../state/apiProjects.selector';
import { User } from 'src/app/models/User.model';
import { UserState } from 'src/app/state/user.state';
import { DataChangeNotifier } from 'src/app/services/dataChangeNotifier.service';

@Component({
  selector: 'app-designer',
  templateUrl: './designer.component.html',
  styleUrls: ['./designer.component.css']
})
export class DesignerComponent implements OnInit, OnDestroy {
  @Select(ApiProjectStateSelector.getPartial) projects$: Observable<ApiProject[]>;
  authUser: User;
  flags = {
    justAdded: ''
  }

  constructor(private store: Store, private dialog: MatDialog, dataChangeNotifier: DataChangeNotifier) {
    this.store.select(UserState.getAuthUser).subscribe(user => {
      this.authUser = user;
    });

    dataChangeNotifier.apiProjects.onAdd$.subscribe(projects => {
      this.flags.justAdded = projects[0]?._id;
      setTimeout(() => {
        this.flags.justAdded = '';
      }, 15000);
    })
  }
  ngOnDestroy(): void {
  }

  ngOnInit(): void {
  }

  async openAddProject() {
    this.dialog.open(NewApiProjectModal);
  }

  showProjImport() {
    this.dialog.open(ImportProjectComponent, { width: '900px' });
  }

}
