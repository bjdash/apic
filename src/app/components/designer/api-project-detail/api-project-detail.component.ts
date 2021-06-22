import { ProjectTraitsComponent } from './project-traits/project-traits.component';
import { ApiProjectService } from './../../../services/apiProject.service';
import { from, Observable, Subject, Subscription } from 'rxjs';
import { ApiModel, ApiProject } from './../../../models/ApiProject.model';
import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router, Event as NavigationEvent, NavigationStart, NavigationEnd } from '@angular/router';
import { Store } from '@ngxs/store';
import { filter, takeUntil } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { ProjectExportModalComponent } from './project-export-modal/project-export-modal.component';
import { ConfirmService } from '../../../directives/confirm.directive';
import { ApiProjectStateSelector } from '../../../state/apiProjects.selector';
import { EnvService } from '../../../services/env.service';
import { Toaster } from '../../../services/toaster.service';
import { UserState } from '../../../state/user.state';
import { User } from '../../../models/User.model';
import { ApiProjectDetailService } from './api-project-detail.service';
import apic from 'src/app/utils/apic';

@Component({
    selector: 'app-api-project-detail',
    templateUrl: './api-project-detail.component.html',
    providers: [ApiProjectDetailService],
    styleUrls: ['../designer.component.css', './api-project-detail.component.css']
})
export class ApiProjectDetailComponent implements OnInit, OnDestroy {
    @ViewChild('traitsView') traitsView: ProjectTraitsComponent;

    private _destroy: Subject<boolean> = new Subject<boolean>();
    private updatedInBackground: 'update' | 'delete' = null;


    private _selectedPROJ: ApiProject;
    selectedPROJ$: Observable<ApiProject>;
    authUser: User;

    leftPanel = {
        expanded: { ungrouped: true }, //list of expanded folders
        tree: null
    };
    flags = {
        stage: 'Dashboard'
    }
    subscriptions: Subscription[] = [];

    constructor(private route: ActivatedRoute,
        private store: Store,
        private router: Router,
        private confirmService: ConfirmService,
        private apiProjectDetailService: ApiProjectDetailService,
        private toaster: Toaster,
        private apiProjectService: ApiProjectService,
        private dialog: MatDialog) {
        this.route.params.subscribe(params => {
            this.selectedPROJ$ = this.apiProjectService.getApiProjectById(params.projectId);

            this.store.select(ApiProjectStateSelector.getLeftTree(params.projectId)).pipe(takeUntil(this._destroy)).subscribe(leftTree => {
                this.leftPanel.tree = leftTree;
            });
            // this.selectedPROJ$ = this.store.select(ApiProjectStateSelector.getById)
            //     .pipe(map(filterFn => filterFn(params.projectId)));
            this.store.select(UserState.getAuthUser).pipe(takeUntil(this._destroy)).subscribe(user => {
                this.authUser = user;
            });
            this.apiProjectService.updatedViaSync$.subscribe((notification) => {
                if (this.selectedPROJ && notification?.ids.includes(this.selectedPROJ._id)) {
                    this.updatedInBackground = notification.type;
                }
            });
            this.apiProjectDetailService.onExportProj$
                .pipe(takeUntil(this._destroy))
                .subscribe(([type, id]) => {
                    this.openExportModal(type, id);
                })
            this.selectedPROJ$
                .pipe(takeUntil(this._destroy))
                // .pipe(delay(0))
                .subscribe(p => {
                    if (p && (p._modified > this.selectedPROJ?._modified || !this.selectedPROJ)) {
                        if (this.updatedInBackground == 'update') {
                            //TODO: Stop children routes updating themselves before ok is clicked in parent
                            this.confirmService.alert({
                                id: 'Sync:Project Updated',
                                confirmTitle: 'Project modified',
                                confirm: 'The selected API project has been modified by another user. Contents of this screen will refresh to reflect changes.',
                                confirmOk: 'Ok'
                            }).then(() => {
                                this.selectedPROJ = p;
                                this.updatedInBackground = null;
                            }).catch(() => { })
                        } else {
                            this.selectedPROJ = p;
                        }
                    }
                    else if (p == undefined && this.selectedPROJ) {
                        if (this.updatedInBackground == 'delete') {
                            this.confirmService.alert({
                                id: 'Sync:Project Deleted',
                                confirmTitle: 'Project deleted',
                                confirm: 'The selected API project has been deleted by its owner.',
                                confirmOk: 'Ok'
                            }).then(() => {
                                this.router.navigate(['designer']);
                                this.updatedInBackground = null;
                            }).catch(() => { })
                        } else {
                            this.router.navigate(['designer'])
                        }
                    }

                    // if (p && (p._modified > this.selectedPROJ?._modified || !this.selectedPROJ)) {
                    //     if (this.selectedPROJ) {
                    //         this.confirmService.alert({
                    //             id: 'Sync:Project Updated',
                    //             confirmTitle: 'Project modified',
                    //             confirm: 'The selected API project has been modified by another user. Contents of this screen will refresh to reflect changes.',
                    //             confirmOk: 'Ok'
                    //         }).then(() => {
                    //             this.selectedPROJ = p;
                    //         }).catch(() => { })
                    //     } else {
                    //         this.selectedPROJ = p;
                    //     }
                    // } else if (p == undefined && this.selectedPROJ) {
                    //     this.confirmService.alert({
                    //         id: 'Sync:Project Deleted',
                    //         confirmTitle: 'Project deleted',
                    //         confirm: 'The selected API project has been deleted by its owner.',
                    //         confirmOk: 'Ok'
                    //     }).then(() => {
                    //         this.router.navigate(['designer'])
                    //     }).catch(() => { })
                    // }
                })
        });

        this.router.events
            .pipe(takeUntil(this._destroy))
            .pipe(filter(event => event instanceof NavigationEnd))
            .subscribe(
                (event: NavigationEnd) => {
                    this.flags.stage = event.url.split('/')[3] || 'dashboard';
                });

        this.updateApiProject = this.updateApiProject.bind(this)
    }
    ngOnDestroy(): void {
        this._destroy.next();
        this._destroy.complete();
    }
    ngOnInit(): void {

    }

    get selectedPROJ() {
        return this._selectedPROJ;
    }

    set selectedPROJ(proj: ApiProject) {
        this._selectedPROJ = proj;
        this.apiProjectDetailService.selectProj(proj);
    }

    openItem(type, id, event?) {
        if (event) event.stopPropagation();
        this.router.navigate([type, id], { relativeTo: this.route })
    }

    duplicateModel(modelId: string) {
        var toCopy: ApiModel = { ...this.selectedPROJ.models[modelId] };
        toCopy._id = apic.s12();
        while (this.checkExistingModel(toCopy.name)) {
            var counter = parseInt(toCopy.name.charAt(toCopy.name.length - 1));
            var numberAtEnd = true;
            if (isNaN(counter)) {
                counter = 0;
                numberAtEnd = false;
            }
            counter++;
            toCopy.name =
                (numberAtEnd
                    ? toCopy.name.substring(0, toCopy.name.length - 1)
                    : toCopy.name
                ).trim() +
                ' ' +
                counter;
            toCopy.nameSpace =
                (numberAtEnd
                    ? toCopy.nameSpace.substring(0, toCopy.nameSpace.length - 1)
                    : toCopy.nameSpace
                ).trim() +
                ' ' +
                counter;
        }
        let project: ApiProject = { ...this.selectedPROJ, models: { ...this.selectedPROJ.models, [toCopy._id]: toCopy } }
        this.updateApiProject(project).then(() => {
            this.toaster.success('Duplicate Model ' + toCopy.name + ' created.');
        });
    }
    checkExistingModel(name: string): boolean {
        if (!name) return false;

        return this.selectedPROJ?.models && Object.values(this.selectedPROJ.models).find((model: ApiModel) => model.name.toLowerCase() ===
            name.toLowerCase()) !== undefined;
    }
    deleteModel(id) {
        alert()
    }

    sortLeftTreeFolder = (a, b): number => {
        if (b && b.value.folder._id === 'ungrouped') return -1;
        return a.value.folder.name.localeCompare(b.value);
    }

    //TODO: remove this when all components moved to routes
    async updateApiProject(proj?: ApiProject): Promise<ApiProject> {
        if (!proj) proj = this.selectedPROJ;
        this.selectedPROJ = await this.apiProjectService.updateAPIProject(proj);
        return this.selectedPROJ;
    }

    toggleExpand(id: string) {
        this.leftPanel.expanded[id] = !this.leftPanel.expanded[id];
    }

    openExportModal(type, id) {
        this.dialog.open(ProjectExportModalComponent, { data: { type, id }, width: '1100px' });
    }
}
