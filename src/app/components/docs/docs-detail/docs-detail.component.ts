import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Store } from '@ngxs/store';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ApiProject } from 'src/app/models/ApiProject.model';
import { ApiProjectService } from 'src/app/services/apiProject.service';
import { SwaggerService } from 'src/app/services/swagger.service';
// import SwaggerParser from "@apidevtools/swagger-parser";
// import * as SwaggerParser from '../../../utils/bundle2';
import { Utils } from 'src/app/services/utils.service';
declare var SwaggerParser;
@Component({
  selector: 'app-docs-detail',
  templateUrl: './docs-detail.component.html',
  styleUrls: ['./docs-detail.component.scss']
})
export class DocsDetailComponent implements OnInit, OnDestroy {
  selectedPROJ: ApiProject;
  selectedPROJ$: Observable<ApiProject>;
  resolvedSpec;
  leftTree: any;
  tagGroups: any;
  private _destroy: Subject<boolean> = new Subject<boolean>();
  error;

  flags = {
    parsing: false,
    hideInfo: false,
    hidePaths: false,
    hideModels: false,
    groupBy: 'url'
  }
  hiddenPaths = {

  }
  visibleEndps = {

  }

  constructor(
    private route: ActivatedRoute,
    private store: Store,
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
    let spec: string = this.swaggerService.exportOAS(project, 'object');
    this.resolvedSpec = await SwaggerParser.dereference(spec, { dereference: { circular: false } });
    this.leftTree = this.generateLeftTree();

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

  generateLeftTree() {
    let leftTree: any = {
      ungrouped: {
        models: {},
        traits: {},
        endps: {}
      }
    };
    for (const [_id, folder] of Utils.objectEntries(this.selectedPROJ.folders)) {
      leftTree[_id] = {};
      leftTree[_id].folder = this.selectedPROJ.folders[_id];
      leftTree[_id].models = {};
      leftTree[_id].traits = {};
      leftTree[_id].endps = {};
    }
    for (const [_id, model] of Utils.objectEntries(this.selectedPROJ.models)) {
      var modelX = {
        _id: model._id,
        name: model.name,
        nameSpace: model.nameSpace
      };
      if (leftTree[model.folder]) {
        leftTree[model.folder].models[model._id] = modelX;
      } else {
        leftTree.ungrouped.models[model._id] = modelX;
      }
    }
    for (const [_id, trait] of Utils.objectEntries(this.selectedPROJ.traits)) {
      var traitX = {
        _id: trait._id,
        name: trait.name
      };
      if (leftTree[trait.folder]) {
        leftTree[trait.folder].traits[trait._id] = traitX;
      } else {
        leftTree.ungrouped.traits[trait._id] = traitX;
      }
    }
    for (const [_id, endp] of Utils.objectEntries(this.selectedPROJ.endpoints)) {
      var endpX = {
        _id: endp._id,
        name: endp.summary,
        method: endp.method,
        path: endp.path
      };
      if (leftTree[endp.folder]) {
        leftTree[endp.folder].endps[endp._id] = endpX;
      } else {
        leftTree.ungrouped.endps[endp._id] = endpX;
      }
    }

    return leftTree;
  }

  scrollInView(f: string) {
    const element = document.getElementById(f)
    if (element) element.scrollIntoView()
  }
}
