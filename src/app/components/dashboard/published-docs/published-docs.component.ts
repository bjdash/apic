import { Component, OnInit } from '@angular/core';
import { Select } from '@ngxs/store';
import { Observable } from 'rxjs';
import { first } from 'rxjs/operators';
import { ApiProject } from 'src/app/models/ApiProject.model';
import { PublishedDocs } from 'src/app/models/PublishedDoc.model';
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
  constructor(private http: HttpService, private toaster: Toaster) { }

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
}
