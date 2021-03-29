import { ProjectTraitsComponent } from './project-traits/project-traits.component';
import { ProjectFolderComponent } from './project-folder/project-folder.component';
import { ApiProjectService } from './../services/apiProject.service';
import { from, Observable, Subject, Subscription } from 'rxjs';
import { ApiProject } from './../models/ApiProject.model';
import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { createSelector, Store } from '@ngxs/store';
import { delay, delayWhen, map, takeUntil } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { ProjectExportModalComponent } from './project-export-modal/project-export-modal.component';
import { ConfirmService } from '../directives/confirm.directive';
import { ApiProjectStateSelector } from '../state/apiProjects.selector';

@Component({
    selector: 'app-api-project-detail',
    templateUrl: './api-project-detail.component.html',
    styleUrls: ['../designer/designer.component.css', './api-project-detail.component.css']
})
export class ApiProjectDetailComponent implements OnInit, OnDestroy {
    @ViewChild('foldersView') foldersView: ProjectFolderComponent;
    @ViewChild('modelsView') modelsView: ProjectFolderComponent;
    @ViewChild('traitsView') traitsView: ProjectTraitsComponent;

    private destroy: Subject<boolean> = new Subject<boolean>();
    private pendingUpdate: Promise<ApiProject> = Promise.resolve(null);

    selectedPROJ: ApiProject;
    selectedPROJ$: Observable<ApiProject>;
    leftPanel = {
        expanded: { ungrouped: true }, //list of expanded folders
        tree: null
    };
    flags = {
        stage: 'dashboard'
    }
    subscriptions: Subscription[] = [];
    test: Subscription;

    constructor(private route: ActivatedRoute,
        private store: Store,
        private router: Router,
        private confirmService: ConfirmService,
        private apiProjectService: ApiProjectService,
        private dialog: MatDialog) {
        this.route.params.subscribe(params => {
            this.selectedPROJ$ = this.store.select(ApiProjectStateSelector.getByIdDynamic(params.projectId));

            this.store.select(ApiProjectStateSelector.getLeftTree(params.projectId)).subscribe(leftTree => {
                this.leftPanel.tree = leftTree;
            });
            // this.selectedPROJ$ = this.store.select(ApiProjectStateSelector.getById)
            //     .pipe(map(filterFn => filterFn(params.projectId)));

            this.test = this.selectedPROJ$
                .pipe(takeUntil(this.destroy))
                .pipe(delayWhen(() => from(this.pendingUpdate)))
                // .pipe(delay(0))
                .subscribe(p => {
                    if (p && p._modified !== this.selectedPROJ?._modified) {
                        if (this.selectedPROJ) {
                            this.confirmService.alert({
                                id: 'Sync:Project Updated',
                                confirmTitle: 'Project modified',
                                confirm: 'The selected API project has been modified by another user. Contents of this screen will refresh to reflect changes.',
                                confirmOk: 'Ok'
                            }).then(() => {
                                this.selectedPROJ = p;
                            }).catch(() => { })
                        } else {
                            this.selectedPROJ = p;
                        }
                    } else if (p == undefined && this.selectedPROJ) {
                        this.confirmService.alert({
                            id: 'Sync:Project Deleted',
                            confirmTitle: 'Project deleted',
                            confirm: 'The selected API project has been deleted by its owner.',
                            confirmOk: 'Ok'
                        }).then(() => {
                            this.router.navigate(['designer'])
                        }).catch(() => { })
                    }
                })
        });

        this.updateApiProject = this.updateApiProject.bind(this)
    }
    ngOnDestroy(): void {
        this.destroy.next(true);
        this.destroy.complete();
    }
    ngOnInit(): void {

    }

    changeStage(name: string) {
        this.flags.stage = name;
    }

    sortLeftTreeFolder = (a, b): number => {
        if (b && b.value.folder._id === 'ungrouped') return -1;
        return a.value.folder.name.localeCompare(b.value);
    }

    async updateApiProject(proj?: ApiProject): Promise<ApiProject> {
        if (!proj) proj = this.selectedPROJ;
        this.pendingUpdate = this.apiProjectService.updateAPIProject(proj);
        this.selectedPROJ = await this.pendingUpdate;
        console.log('updated proj', this.selectedPROJ._modified);
        return this.selectedPROJ;
    }

    toggleExpand(id: string) {
        this.leftPanel.expanded[id] = !this.leftPanel.expanded[id];
    }

    openExportModal(type, id) {
        this.dialog.open(ProjectExportModalComponent, { data: { type, id }, width: '1100px' });
    }
}
