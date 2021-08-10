import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Select } from '@ngxs/store';
import { Observable } from 'rxjs';
import { first } from 'rxjs/operators';
import { ApiProject } from 'src/app/models/ApiProject.model';
import { PublishedDocs } from 'src/app/models/PublishedDoc.model';
import { AuthService } from 'src/app/services/auth.service';
import { HttpService } from 'src/app/services/http.service';
import { Toaster } from 'src/app/services/toaster.service';
import { ApiProjectStateSelector } from 'src/app/state/apiProjects.selector';

@Component({
  selector: 'app-published-docs',
  templateUrl: './published-docs.component.html',
  styleUrls: ['./published-docs.component.scss']
})
export class PublishedDocsComponent implements OnInit {
  @Select(ApiProjectStateSelector.getPartial) projects$: Observable<ApiProject[]>;

  docs: PublishedDocs[] = []
  flags = {
    loading: false,
    showCreate: false
  }
  constructor(private http: HttpService, private toaster: Toaster, private authService: AuthService, private router: Router, private route: ActivatedRoute) { }

  ngOnInit(): void {
    this.getDocs();
  }

  getDocs() {
    this.flags.loading = true;
    this.http.getPublishedDocs().pipe(first())
      .subscribe(docs => {
        this.flags.loading = false;
        this.docs = docs;
      }, () => {
        this.flags.loading = false;
      })
  }

  deleteDoc(id) {
    this.flags.loading = true;
    this.http.deletePublishedDoc(id).pipe(first())
      .subscribe(success => {
        this.flags.loading = false;
        this.toaster.success('Doc deleted.');
        this.getDocs();
      }, () => {
        this.flags.loading = false;
      })
  }

  trackbyFn(index) {
    return index
  }

  publish(project: ApiProject) {
    if (project._id.includes('demo')) {
      this.toaster.error('This is  a demo project and can\'t be published.');
      return;
    }
    if (!this.authService.doIOwn(project)) {
      this.toaster.error('You can\'t publish this project as you are not the owner of it.');
      return;
    }
    this.router.navigate([project.publishedId ? project.publishedId : 'new'], { relativeTo: this.route, queryParams: { projId: project._id, title: project.title } })
  }
}
