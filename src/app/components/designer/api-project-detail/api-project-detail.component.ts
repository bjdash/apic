import { ApiProjectService } from './../../../services/apiProject.service';
import { asapScheduler, BehaviorSubject, NEVER, Observable, Subject } from 'rxjs';
import { ApiProject, LeftTreeItem, ProjectItemTypes } from './../../../models/ApiProject.model';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router, Event as NavigationEvent, NavigationEnd } from '@angular/router';
import { Store } from '@ngxs/store';
import { filter, observeOn, switchMap, takeUntil } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { ProjectExportModalComponent } from './project-export-modal/project-export-modal.component';
import { ConfirmService } from '../../../directives/confirm.directive';
import { ApiProjectStateSelector } from '../../../state/apiProjects.selector';
import { Toaster } from '../../../services/toaster.service';
import { UserState } from '../../../state/user.state';
import { User } from '../../../models/User.model';
import { ApiProjectDetailService } from './api-project-detail.service';
import apic from 'src/app/utils/apic';
import { DetachedRouteHandlerService } from 'src/app/detached-route-handler.service';
import { SharingService } from 'src/app/services/sharing.service';

@Component({
    selector: 'app-api-project-detail',
    templateUrl: './api-project-detail.component.html',
    providers: [ApiProjectDetailService],
    styleUrls: ['../designer.component.css', './api-project-detail.component.scss']
})
export class ApiProjectDetailComponent implements OnInit, OnDestroy {
    private _destroy: Subject<boolean> = new Subject<boolean>();
    private updatedInBackground: 'update' | 'delete' = null;

    private _selectedPROJ: ApiProject;
    selectedPROJ$: Observable<ApiProject>;
    authUser: User;

    paused$ = new BehaviorSubject(false);
    leftPanel: {
        expanded: { [key: string]: boolean },
        expandAll: boolean,
        tree: LeftTreeItem[],
        sort: { [key: string]: { by: string, ascending: boolean } }
    } = {
            sort: {
                folder: {
                    by: 'name',
                    ascending: true
                },
                children: {
                    by: 'name',
                    ascending: true
                }
            },
            expanded: { ungrouped: true }, //list of expanded folders,
            expandAll: false,
            tree: null,
        };

    flags = {
        stage: 'Dashboard',
        loading: true,
        showSearch: false,
        searchText: ''
    }

    constructor(private detachedRouteHandlesService: DetachedRouteHandlerService,
        private route: ActivatedRoute,
        private store: Store,
        private router: Router,
        private confirmService: ConfirmService,
        private apiProjectDetailService: ApiProjectDetailService,
        private toaster: Toaster,
        sharingService: SharingService,
        private apiProjectService: ApiProjectService,
        private dialog: MatDialog) {
        this.route.params.subscribe(params => {
            this.store.select(ApiProjectStateSelector.getLeftTree(params.projectId)).pipe(takeUntil(this._destroy)).subscribe(leftTree => {
                this.leftPanel.tree = leftTree;
            });
            this.store.select(UserState.getAuthUser).pipe(takeUntil(this._destroy)).subscribe(user => {
                this.authUser = user;
            });
            this.paused$
                .pipe(switchMap(paused => {
                    return paused ? NEVER : this.apiProjectService.updatedViaSync$
                }))
                .pipe(takeUntil(this._destroy))
                .subscribe((notification) => {
                    if (this.selectedPROJ && notification?.ids.includes(this.selectedPROJ._id) && !notification?.forceUpdate) {
                        this.updatedInBackground = notification.type;
                    }
                });
            this.apiProjectDetailService.onExportProj$
                .pipe(takeUntil(this._destroy))
                .subscribe(([type, id]) => {
                    this.openExportModal(type, id);
                })

            this.selectedPROJ$ = this.apiProjectService.getApiProjectById(params.projectId);
            // this.selectedPROJ$
            this.paused$
                .pipe(
                    switchMap(paused => {
                        return paused ? NEVER : this.selectedPROJ$
                    })
                )
                .pipe(takeUntil(this._destroy))
                .subscribe(p => {
                    if (p && (p._modified > this.selectedPROJ?._modified || !this.selectedPROJ)) {
                        if (this.updatedInBackground == 'update' && !sharingService.isLastShared(this.selectedPROJ?._id, 'APIProject')) {
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
                            this.updatedInBackground = null;
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
                    this.flags.loading = false
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
        this.detachedRouteHandlesService.changes$
            .pipe(
                observeOn(asapScheduler)
            ).subscribe(changes => {
                if (changes.for == this.route.component) {
                    if (changes.store.has(this.route.component)) {
                        //route unloaded
                        this.paused$.next(true);
                    } else {
                        //route loaded
                        this.selectedPROJ = null;
                        this.paused$.next(false)
                    }
                }
            });
    }

    get selectedPROJ() {
        return this._selectedPROJ;
    }

    set selectedPROJ(proj: ApiProject) {
        this._selectedPROJ = proj;
        this.apiProjectDetailService.selectProj(proj);
    }

    async duplicateItem(id: string, type: ProjectItemTypes) {
        var toCopy = { ...this.selectedPROJ[type][id] };
        toCopy._id = apic.s12();
        let nameProperty = this.getNameProperty(type);
        while (this.checkExistingItem(nameProperty, toCopy[nameProperty], type)) {
            var counter = parseInt(toCopy[nameProperty].charAt(toCopy[nameProperty].length - 1));
            var numberAtEnd = true;
            if (isNaN(counter)) {
                counter = 0;
                numberAtEnd = false;
            }
            counter++;
            toCopy[nameProperty] =
                (numberAtEnd
                    ? toCopy[nameProperty].substring(0, toCopy[nameProperty].length - 1)
                    : toCopy[nameProperty]
                ).trim() +
                ' ' +
                counter;
            if (type === 'models') {
                toCopy['nameSpace'] =
                    (numberAtEnd
                        ? toCopy['nameSpace'].substring(0, toCopy['nameSpace'].length - 1)
                        : toCopy['nameSpace']
                    ).trim() +
                    '_' +
                    counter;
            }
        }
        let project: ApiProject = { ...this.selectedPROJ, [type]: { ...this.selectedPROJ[type], [toCopy._id]: toCopy } }
        try {
            await this.updateApiProject(project);
            this.toaster.success(`Duplicate ${type.substring(0, type.length - 1)} '${toCopy[nameProperty]}' created.`);
        } catch (e) {
            this.toaster.error(`Failed to duplicate. ${e?.message || e || ''}`);
        }
    }

    deleteItem(id: string, type: ProjectItemTypes, deleteFolderContent = false) {
        if (!id || !this.selectedPROJ[type]) return;

        const { [id]: toRemove, ...remaining } = this.selectedPROJ[type];
        let project: ApiProject = { ...this.selectedPROJ, [type]: remaining };
        if (type === 'folders') {
            this.leftPanel.tree.find(f => f._id === id)
                ?.children.forEach(child => {
                    const { [child._id]: toRemove, ...remaining } = project[child.type];
                    if (deleteFolderContent) {
                        project = { ...project, [child.type]: remaining }
                    } else {
                        project = { ...project, [child.type]: { ...remaining, [child._id]: { ...toRemove, folder: null } } }
                    }
                })
        }
        let nameProperty = this.getNameProperty(type);
        let deleteMsg = `Do you want to delete the ${type.substring(0, type.length - 1)} '${toRemove[nameProperty]}' ${deleteFolderContent ? 'and its contents' : ''}?`

        this.confirmService
            .confirm({
                confirmTitle: 'Delete Confirmation',
                confirm: deleteMsg,
                confirmOk: 'Delete',
                confirmCancel: 'Cancel',
            })
            .then(async () => {
                try {
                    await this.updateApiProject(project);
                    this.toaster.success(`Selected ${type.substring(0, type.length - 1)} deleted.`);
                } catch (e) {
                    console.error(`Failed to delete ${type.substring(0, type.length - 1)}`, e);
                    this.toaster.error(`Failed to delete ${type.substring(0, type.length - 1)}: ${e?.message || e || ''}`);
                }
            }).catch(() => { });
    }

    checkExistingItem(nameProperty: string, nameValue: string, type: ProjectItemTypes): boolean {
        if (!nameValue || !nameProperty) return false;

        return this.selectedPROJ[type] && Object.values(this.selectedPROJ[type]).find((item) => item[nameProperty].toLowerCase() ===
            nameValue.toLowerCase()) !== undefined;
    }
    private getNameProperty(type: ProjectItemTypes) {
        switch (type) {
            case 'models':
            case 'traits':
            case 'examples':
            case 'folders':
                return 'name';
            case 'endpoints':
                return 'summary';
        }
    }

    run(endpId: string) {
        this.apiProjectDetailService.runEndp(endpId, this.selectedPROJ);
    }

    async updateApiProject(proj?: ApiProject): Promise<ApiProject> {
        if (!proj) proj = this.selectedPROJ;
        this.selectedPROJ = await this.apiProjectService.updateAPIProject(proj);
        return this.selectedPROJ;
    }

    toggleExpand(id: string) {
        this.leftPanel.expanded[id] = !this.leftPanel.expanded[id];
    }

    toggleExpandAll() {
        this.leftPanel.expandAll = !this.leftPanel.expandAll;
        this.leftPanel.tree.forEach(folder => {
            this.leftPanel.expanded[folder._id] = this.leftPanel.expandAll;
        })
    }

    openExportModal(type, id) {
        this.dialog.open(ProjectExportModalComponent, { data: { type, id }, width: '1100px' });
    }

    async buildRequests() {
        this.apiProjectDetailService.buildRequests(this.selectedPROJ);
    }

    sortTree(type, by, event?) {
        if (this.leftPanel.sort[type].by === by) {
            this.leftPanel.sort[type].ascending = !this.leftPanel.sort[type].ascending;
        } else {
            this.leftPanel.sort[type].by = by;
        }
        event?.stopPropagation()
    }

    showSearch() {
        this.flags.showSearch = true;
        document.getElementById('proj-search')?.focus();
        this.leftPanel.expandAll = false;
        this.toggleExpandAll();
    }
}
