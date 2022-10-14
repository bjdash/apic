import { NewApiProjectModal } from './newApiProject/newApiProject.modal.component';
import { ApiProject } from './../../models/ApiProject.model';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { Select, Store } from '@ngxs/store';
import { MatDialog } from '@angular/material/dialog';
import { ImportProjectComponent } from './import-project/import-project.component';
import { ApiProjectStateSelector } from '../../state/apiProjects.selector';
import { User } from 'src/app/models/User.model';
import { UserState } from 'src/app/state/user.state';
import { DataChangeNotifier } from 'src/app/services/dataChangeNotifier.service';
import LocalStore from 'src/app/services/localStore';

@Component({
  selector: 'app-designer',
  templateUrl: './designer.component.html',
  styleUrls: ['./designer.component.css']
})
export class DesignerComponent implements OnInit, OnDestroy {
  @Select(ApiProjectStateSelector.getPartial) projects$: Observable<ApiProject[]>;
  authUser: User;
  flags = {
    justAdded: '',
    sortBy: LocalStore.getOrDefault(LocalStore.PROJ_SORT_BY, 'title'),
    sortAscending: (LocalStore.getOrDefault(LocalStore.PROJ_SORT_ORDER, 'true') === 'true')
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


  sortList(by, event?) {
    if (this.flags.sortBy === by) {
      this.flags.sortAscending = !this.flags.sortAscending;
      LocalStore.set(LocalStore.PROJ_SORT_ORDER, this.flags.sortAscending)
    } else {
      this.flags.sortBy = by;
      LocalStore.set(LocalStore.PROJ_SORT_BY, by)
    }
    event?.stopPropagation()
  }
  // async onChg (event) {
  // let output = document.getElementById("listing");
  // for (const file of event.target.files) {
  // //let item = document.createElement("li");
  //   let etxt = await file.text();
  //   console.log(etxt);
  //   item.textContent = file.webkit RelativePath;
  //   output.appendChild(item);
  // };

}
