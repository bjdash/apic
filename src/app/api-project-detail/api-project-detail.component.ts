import { ProjectTraitsComponent } from './project-traits/project-traits.component';
import { ProjectFolderComponent } from './project-folder/project-folder.component';
import { ApiProjectService } from './../services/apiProject.service';
import { ApiProjectState } from './../state/apiProjects.state';
import { Observable } from 'rxjs';
import { ApiProject } from './../models/ApiProject.model';
import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Store } from '@ngxs/store';
import { map } from 'rxjs/operators';
import { KeyValue } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { ProjectExportModalComponent } from './project-export-modal/project-export-modal.component';

@Component({
    selector: 'app-api-project-detail',
    templateUrl: './api-project-detail.component.html',
    styleUrls: ['../designer/designer.component.css', './api-project-detail.component.css']
})
export class ApiProjectDetailComponent implements OnInit {
    @ViewChild('foldersView') foldersView: ProjectFolderComponent;
    @ViewChild('modelsView') modelsView: ProjectFolderComponent;
    @ViewChild('traitsView') traitsView: ProjectTraitsComponent;

    selectedPROJ: ApiProject;
    selectedPROJ$: Observable<ApiProject>;
    LeftTree: any = {};
    flags = {
        stage: 'dashboard'
    }

    constructor(private route: ActivatedRoute,
        private store: Store,
        private apiProjectService: ApiProjectService,
        private dialog: MatDialog) {
        this.route.params.subscribe(params => {
            this.selectedPROJ$ = this.store.select(ApiProjectState.getById)
                .pipe(map(filterFn => filterFn(params.projectId)));

            this.selectedPROJ$.subscribe(p => {
                if (p) {
                    this.selectedPROJ = p;
                    this.generateLeftTree()
                }
            })
        });

        this.updateApiProject = this.updateApiProject.bind(this)
    }
    ngOnInit(): void {

    }

    changeStage(name: string) {
        this.flags.stage = name;
    }

    generateLeftTree() {
        this.LeftTree = {
            ungrouped: {
                models: {},
                traits: {},
                endps: {},
                folder: {
                    _id: 'ungrouped',
                    name: "Ungrouped",
                    expand: true
                }
            }
        };
        this.selectedPROJ.folders && Object.keys(this.selectedPROJ.folders).forEach(fId => {
            this.LeftTree[fId] = {
                folder: this.selectedPROJ.folders[fId],
                models: {},
                traits: {},
                endps: {}
            };
        })

        this.selectedPROJ.models && Object.keys(this.selectedPROJ.models).forEach(mId => {
            this.addModelToLeftTree(this.selectedPROJ.models[mId]);
        });

        this.selectedPROJ.traits && Object.keys(this.selectedPROJ.traits).forEach(tId => {
            this.addTraitsToLeftTree(this.selectedPROJ.traits[tId]);
        });

        this.selectedPROJ.endpoints && Object.keys(this.selectedPROJ.endpoints).forEach(eId => {
            this.addEndpToLeftTree(this.selectedPROJ.endpoints[eId]);
        });
    }

    private addModelToLeftTree(model, prevFolder?: any) {
        if (prevFolder && this.LeftTree[prevFolder]) {
            delete this.LeftTree[prevFolder].models[model._id];
        } else if (prevFolder) { //if only prev folder id exists but teh folder is not in the left tree (folder was deleted recently)
            delete this.LeftTree.ungrouped.models[model._id];
        }
        var modelX = {
            _id: model._id,
            name: model.name
        };
        if (this.LeftTree[model.folder]) {
            this.LeftTree[model.folder].models[model._id] = modelX;
        } else {
            this.LeftTree.ungrouped.models[model._id] = modelX;
        }
    }

    private addTraitsToLeftTree(trait, prevFolder?: any) {
        if (prevFolder && this.LeftTree[prevFolder]) {
            delete this.LeftTree[prevFolder].traits[trait._id];
        } else if (prevFolder) { //if only prev folder id exists but the folder is not in the left tree (folder was deleted recently)
            delete this.LeftTree.ungrouped.traits[trait._id];
        }
        var traitX = {
            _id: trait._id,
            name: trait.name
        };
        if (this.LeftTree[trait.folder]) {
            this.LeftTree[trait.folder].traits[trait._id] = traitX;
        } else {
            this.LeftTree.ungrouped.traits[trait._id] = traitX;
        }
    }

    private addEndpToLeftTree(endp, prevFolder?: any) {
        if (prevFolder && this.LeftTree[prevFolder]) {
            delete this.LeftTree[prevFolder].endps[endp._id];
        } else if (prevFolder) { //if only prev folder id exists but teh folder is not in the left tree (folder was deleted recently)
            delete this.LeftTree.ungrouped.endps[endp._id];
        }
        var endpX = {
            _id: endp._id,
            name: endp.summary,
            method: endp.method
        };
        if (this.LeftTree[endp.folder]) {
            this.LeftTree[endp.folder].endps[endp._id] = endpX;
        } else {
            this.LeftTree.ungrouped.endps[endp._id] = endpX;
        }
    }

    sortLeftTreeFolder = (a, b): number => {
        if (b && b.value.folder._id === 'ungrouped') return -1;
        return a.value.folder.name.localeCompare(b.value);
    }

    updateApiProject(proj?: ApiProject) {
        if (!proj) proj = this.selectedPROJ;
        return this.apiProjectService.updateAPIProject(proj);
    }

    projectUpdated(updated) {
        this.generateLeftTree()
    }

    openExportModal(type, id) {
        this.dialog.open(ProjectExportModalComponent, { data: { type, id }, width: '1100px' });
    }
}
