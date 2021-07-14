import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngxs/store';
import { combineLatest } from 'rxjs';
import { first, map, take } from 'rxjs/operators';
import { ApiProject } from 'src/app/models/ApiProject.model';
import { PublishedDocs } from 'src/app/models/PublishedDoc.model';
import { ApiProjectService } from 'src/app/services/apiProject.service';
import { HttpService } from 'src/app/services/http.service';
import { Toaster } from 'src/app/services/toaster.service';
import { ApiProjectStateSelector } from 'src/app/state/apiProjects.selector';

@Component({
  selector: 'app-published-docs-detail',
  templateUrl: './published-docs-detail.component.html'
})
export class PublishedDocsDetailComponent implements OnInit {
  selectedDocId: string
  selectedDoc: PublishedDocs;
  form: FormGroup;
  flags = {
    loading: false,
    updating: false
  }
  constructor(
    private route: ActivatedRoute,
    private http: HttpService,
    private toaster: Toaster,
    fb: FormBuilder,
    private store: Store,
    private projService: ApiProjectService,
    private router: Router
  ) {
    this.form = fb.group({
      title: ['', [Validators.required, Validators.maxLength(100)]],
      version: ['', [Validators.required]],
      logo: [''],
      favicon: [''],
      css: [''],
      projId: ['']
    });
    // combineLatest([this.route.params, this.route.queryParams])
    //   .subscribe(value => console.log(value))
    this.route.params.subscribe(params => {
      this.selectedDocId = params.docId;
      if (this.isNew()) {
        this.form.reset();
        this.selectedDoc = null;
      } else {
        this.getDocDetail(this.selectedDocId)
      }
    });

    this.route.queryParams.subscribe(params => {
      setTimeout(() => {
        if (params.projId) this.form.patchValue({ projId: params.projId })
        if (params.title) this.form.patchValue({ title: params.title })
      }, 0);
    })

  }

  ngOnInit(): void {
  }

  getDocDetail(id) {
    this.flags.loading = true;
    this.http.getPublishedDocsById(id).pipe(first())
      .subscribe(team => {
        this.flags.loading = false;
        this.selectedDoc = team;
        let { title, version, logo, favicon, css, projId } = this.selectedDoc;
        this.form.patchValue({ title, version, logo, favicon, css, projId })
      }, () => {
        this.flags.loading = false;
      })
  }
  publish() {
    if (this.isNew()) {
      this.createPublishedDoc()
    } else {
      this.replublish();
    }
  }

  createPublishedDoc() {
    if (this.form.invalid) {
      this.toaster.error('Please fill in the details correctly.');
      return
    }
    let { title, version, logo, favicon, css, projId } = this.form.value;
    if (projId.includes('demo')) {
      this.toaster.error('This is a demo project and can\'t be published.');
      return;
    }
    this.http.createPublishedDoc({ title, version, logo, favicon, css, projId }).pipe(first())
      .subscribe(async (newDoc: PublishedDocs) => {
        this.flags.updating = false;
        let apiProj: ApiProject = await this.store.select(ApiProjectStateSelector.getById)
          .pipe(map(filterFn => filterFn(projId)))
          .pipe(take(1)).toPromise();
        if (apiProj) {
          await this.projService.updateAPIProject({ ...apiProj, publishedId: newDoc.id });
        }
        this.router.navigate(['../', newDoc.id], { relativeTo: this.route })
        this.toaster.success('Doc created.');
      }, () => {
        this.flags.updating = false;
      })
  }

  replublish() {
    if (this.form.invalid) {
      this.toaster.error('Please fill in the details correctly.');
      return
    }
    this.flags.updating = true;
    let { title, version, logo, favicon, css, projId } = this.form.value;
    this.http.updatePublishedDoc(this.selectedDocId, { title, version, logo, favicon, css, projId }).pipe(first())
      .subscribe(success => {
        this.flags.updating = false;
        this.toaster.success('Doc updated.');
        this.getDocDetail(this.selectedDocId)
      }, () => {
        this.flags.updating = false;
      })
  }
  isNew() {
    return this.selectedDocId === 'new';
  }
}
