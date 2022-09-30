import { Component, OnDestroy, OnInit, QueryList, ViewChildren } from '@angular/core';
import { MatTabGroup } from '@angular/material/tabs';
import { ActivatedRoute } from '@angular/router';
import { Select, Store } from '@ngxs/store';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ApiProject } from 'src/app/models/ApiProject.model';
import { ApiProjectService } from 'src/app/services/apiProject.service';
import { ImportExportService } from 'src/app/services/importExport.service';
import { Utils } from 'src/app/services/utils.service';
import { ApiProjectStateSelector } from 'src/app/state/apiProjects.selector';
import { SchemaDref } from 'src/app/utils/SchemaDref';
import { JsonSchemaService } from '../../common/json-schema-builder/jsonschema.service';
import { ApiProjectDetailService } from '../../designer/api-project-detail/api-project-detail.service';

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

  objRef = Object
  resolvedSpec;
  tagGroups: any;
  private _destroy: Subject<boolean> = new Subject<boolean>();
  error;

  flags: { parsing: boolean, groupBy: 'url' | 'tags' } = {
    parsing: false,
    groupBy: 'tags'
  }
  hiddenPaths = {}

  constructor(
    private route: ActivatedRoute,
    private store: Store,
    private apiProjectDetailService: ApiProjectDetailService,
    private apiProjectService: ApiProjectService,
    private swaggerService: ImportExportService
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
    let spec = this.swaggerService.exportOAS3(project, null, { includeApicIds: true });
    let deref = new SchemaDref();
    this.resolvedSpec = deref.dereference(Utils.clone(spec))

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
    if (this.flags.groupBy === 'url') {
      this.tabs.get(i + 1).selectedIndex = j;
    }
    setTimeout(() => {
      const element = document.getElementById(f)
      if (element) element.scrollIntoView()
      if (this.flags.groupBy === 'tags') {
        let operation = element.nextSibling.childNodes[j] as HTMLElement;
        (operation.querySelector('details:not([open]) summary') as HTMLElement)?.click();
        operation?.scrollIntoView();
      }
    }, 0);
  }

  run(endpId: string) {
    this.apiProjectDetailService.runEndp(endpId, this.selectedPROJ);
  }

  generateExample(schemaAndExamples: { examples?: { [key: string]: any }, example?: any, schema?: any }) {
    if (schemaAndExamples?.examples) {
      return Utils.objectValues(schemaAndExamples.examples)[0]?.value;
    }
    if (schemaAndExamples?.example) {
      return schemaAndExamples.example;
    } else
      return JsonSchemaService.schemaToExample(schemaAndExamples?.schema, {});
  }

  shouldShowSchema(schema) {
    if (!schema) {
      return false
    } else {
      if (schema.type === 'object' && (!schema.properties || Object.keys(schema.properties).length === 0)) return false;
    }
    return true;
  }
}
