import { Component, OnInit } from '@angular/core';
import { Select, Store } from '@ngxs/store';
import { Observable } from 'rxjs';
import { ApiProject } from 'src/app/models/ApiProject.model';
import { User } from 'src/app/models/User.model';
import { ApiProjectStateSelector } from 'src/app/state/apiProjects.selector';
import { UserState } from 'src/app/state/user.state';

@Component({
  selector: 'app-docs',
  templateUrl: './docs.component.html',
  styleUrls: ['./docs.component.scss']
})
export class DocsComponent implements OnInit {
  @Select(ApiProjectStateSelector.getPartial) projects$: Observable<ApiProject[]>;
  authUser: User;
  constructor(private store: Store) {
    this.store.select(UserState.getAuthUser).subscribe(user => {
      this.authUser = user;
    });
  }

  ngOnInit(): void {
  }

}
