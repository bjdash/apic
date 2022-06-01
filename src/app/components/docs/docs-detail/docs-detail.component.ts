import { Component, OnDestroy, OnInit, QueryList, ViewChildren } from '@angular/core';
import { MatTabGroup } from '@angular/material/tabs';
import { ActivatedRoute } from '@angular/router';
import { Select, Store } from '@ngxs/store';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ApiProject } from 'src/app/models/ApiProject.model';
import { ApiProjectService } from 'src/app/services/apiProject.service';
import { SwaggerService } from 'src/app/services/swagger.service';
// import SwaggerParser from "@apidevtools/swagger-parser";
// import * as SwaggerParser from '../../../utils/bundle2';
import { Utils } from 'src/app/services/utils.service';
import { ApiProjectStateSelector } from 'src/app/state/apiProjects.selector';
import { ApiProjectDetailService } from '../../designer/api-project-detail/api-project-detail.service';
declare var SwaggerParser;
@Component({
  selector: 'app-docs-detail',
  templateUrl: './docs-detail.component.html',
  styleUrls: ['./docs-detail.component.scss'],
  providers: [ApiProjectDetailService],
})
export class DocsDetailComponent implements OnInit, OnDestroy {
  selectedPROJ: ApiProject;
  selectedPROJ$: Observable<ApiProject>;
  @Select(ApiProjectStateSelector.getPartial) projects$: Observable<ApiProject[]>;
  @ViewChildren(MatTabGroup) tabs: QueryList<MatTabGroup>

  resolvedSpec;
  tagGroups: any;
  private _destroy: Subject<boolean> = new Subject<boolean>();
  error;

  flags: { parsing: boolean, groupBy: 'url' | 'tags' } = {
    parsing: false,
    groupBy: 'url'
  }
  hiddenPaths = {

  }

  constructor(
    private route: ActivatedRoute,
    private store: Store,
    private apiProjectDetailService: ApiProjectDetailService,
    private apiProjectService: ApiProjectService,
    private swaggerService: SwaggerService
  ) {
    this.route.params.subscribe(params => {
      this.selectedPROJ$ = this.apiProjectService.getApiProjectById(params.projectId);
      this.selectedPROJ$.pipe(takeUntil(this._destroy))
        .subscribe(project => {
          if (project) this.buildDocs(project)
        })
    });
  }
  ngOnDestroy(): void {
    this._destroy.next();
    this._destroy.complete();
  }

  ngOnInit(): void {
  }

  async buildDocs(project: ApiProject) {
    this.flags.parsing = true;
    this.selectedPROJ = project;
    this.error = '';
    let spec = this.swaggerService.exportOAS(project, { includeApicIds: true });
    this.resolvedSpec = await SwaggerParser.dereference(spec, { dereference: { circular: false } });

    this.tagGroups = { Untagged: [] }
    Utils.objectKeys(this.resolvedSpec.paths).forEach(path => {
      Utils.objectEntries(this.resolvedSpec.paths[path] as { [key: string]: any }).forEach(([method, endp]) => {
        if (endp.tags && endp.tags.length > 0) {
          endp.tags.forEach((tag) => {
            if (!this.tagGroups[tag]) this.tagGroups[tag] = [];
            endp.method = method;
            endp.path = path;
            this.tagGroups[tag].push(endp);
          });
        } else {
          endp.method = method;
          endp.path = path;
          this.tagGroups.Untagged.push(endp);
        }
      })
    });
    if (this.tagGroups.Untagged.length === 0) delete this.tagGroups.Untagged;

    this.flags.parsing = false;
  }

  scrollInView(f: string, i, j) {
    this.tabs.get(0).selectedIndex = 2;
    this.tabs.get(i + 1).selectedIndex = j;
    setTimeout(() => {
      const element = document.getElementById(f)
      if (element) element.scrollIntoView()
    }, 0);
  }

  run(endpId: string) {
    this.apiProjectDetailService.runEndp(endpId, this.selectedPROJ);
  }

  open(i, j) {
    console.log(this.tabs, i, j);

  }
}
