import { Select, Store } from '@ngxs/store';
import { Injectable } from '@angular/core';
import { ApiProject } from './../models/ApiProject.model';
import { ApiProjectsAction } from './../actions/apiProject.actions';
import iDB from './IndexedDB';
import apic from '../utils/apic';
import { User } from '../models/User.model'
import { SyncService } from './sync.service';
import { UserState } from '../state/user.state';
import { StompMessage } from '../models/StompMessage.model';
import { ENTITIES, ERROR_CODES, SAVED_SETTINGS } from '../utils/constants';
import { ApiProjectStateSelector } from '../state/apiProjects.selector';
import { BehaviorSubject, from, Observable } from 'rxjs';
import { delay, delayWhen, first } from 'rxjs/operators';
import { SyncModifiedNotification } from '../models/SyncModifiedNotification';
import { DataChangeNotifier } from './dataChangeNotifier.service';
import { SandboxService } from './tester.service';

@Injectable()
export class ApiProjectService {
    authUser: User;
    updatedViaSync$: BehaviorSubject<SyncModifiedNotification> = null;


    constructor(private store: Store, private syncService: SyncService, private dataChangeNotifier: DataChangeNotifier, private sandboxService: SandboxService) {
        this.store.select(UserState.getAuthUser).subscribe(user => {
            this.authUser = user;
        });
        this.syncService.onApiProjectMessage$.subscribe(async message => {
            this.onSyncMessage(message);
        })
        this.updatedViaSync$ = new BehaviorSubject(null);
    }

    async loadApiProjs() {
        const projects = await iDB.read(iDB.TABLES.API_PROJECTS);
        this.store.dispatch(new ApiProjectsAction.Refresh(projects));
        return projects;
    }

    getApiProjectById(id): Observable<ApiProject> {
        return this.store.select(ApiProjectStateSelector.getByIdDynamic(id))
    }

    async addProject(projToAdd: ApiProject, addWithSuffix?: boolean): Promise<ApiProject> {
        var ts = new Date().getTime();
        let proj: ApiProject = { ...projToAdd, _id: ts + '-' + apic.s12(), _created: ts, _modified: ts }
        if (this.authUser?.UID) {
            proj.owner = this.authUser.UID;
        } else {
            delete proj.owner
        }

        //owner detail has to be set first before this check
        let allProjs = await this.store.select(ApiProjectStateSelector.getPartial).pipe(first()).toPromise();
        if (addWithSuffix) {
            let duplicate = false
            do {
                duplicate = allProjs.some(p => p.title.toLocaleLowerCase() == proj.title.toLocaleLowerCase() && p.owner === proj.owner)
                if (duplicate) {
                    proj.title += ` ${apic.s4()}`
                }
            } while (duplicate);
        } else if (allProjs.find(p => p.title.toLowerCase() === proj.title.toLowerCase() && p.owner === proj.owner)) {
            throw new Error(ERROR_CODES.get(ERROR_CODES.ESISTS, ENTITIES.APIProject))
        }

        return iDB.insert(iDB.TABLES.API_PROJECTS, proj).then((data: string[]) => {
            if (this.authUser?.UID) {
                this.syncService.prepareAndSync('addAPIProject', [proj]);
            }
            this.dataChangeNotifier.apiProjects.onAdd$.next([proj]);
            return proj;
        });
    }


    async deleteAPIProject(id: string, owner: string) {
        if (owner && this.authUser?.UID !== owner) {
            throw new Error(ERROR_CODES.get(ERROR_CODES.UNAUTHORIZED_NO_OWNER, ENTITIES.APIProject));
        }
        return iDB.delete(iDB.TABLES.API_PROJECTS, id).then((data) => { //data doesnt contain deleted ids
            if (this.authUser?.UID) {
                this.syncService.prepareAndSync('deleteAPIProject', [id]);
            }
            this.store.dispatch(new ApiProjectsAction.Delete([id]));
            return data;
        });
    }

    async updateAPIProject(project: ApiProject): Promise<ApiProject> {
        let allProjs = await this.store.select(ApiProjectStateSelector.getPartial).pipe(first()).toPromise();
        if (allProjs.find(p => p.title.toLowerCase() === project.title.toLowerCase() && p._id != project._id && p.owner === project.owner)) {
            throw new Error(ERROR_CODES.get(ERROR_CODES.ESISTS, ENTITIES.APIProject))
        }
        project._modified = Date.now();
        let data = await iDB.upsert('ApiProjects', project);
        if (data && this.authUser?.UID) {
            var projsToSync = apic.removeDemoItems(project); //returns list
            if (projsToSync.length > 0) {
                this.syncService.prepareAndSync('updateAPIProject', projsToSync);
            }
        }
        this.store.dispatch(new ApiProjectsAction.Update([project]));
        return project;
    }

    async replaceExisting(project: ApiProject): Promise<ApiProject> {
        let allProjs: ApiProject[] = await this.store.select(ApiProjectStateSelector.getAll).pipe(first()).toPromise();
        let existing = allProjs.find(p => p.title.toLowerCase() == project.title.toLowerCase());
        if (existing) {
            let { _id, _created, _modified, owner, publishedId, simKey, team } = existing;
            let toAdd: ApiProject = { ...project, _id, _created, _modified, owner, publishedId, simKey, team };
            if (existing?.setting?.envId) {
                toAdd.setting = { ... (toAdd.setting || existing.setting), envId: existing.setting.envId }
            }

            let data = await iDB.upsert('ApiProjects', toAdd);
            if (data && this.authUser?.UID) {
                var projsToSync = apic.removeDemoItems(toAdd); //returns list
                if (projsToSync.length > 0) {
                    this.syncService.prepareAndSync('updateAPIProject', projsToSync);

                }
            }
            this.store.dispatch(new ApiProjectsAction.Update([toAdd]));
            return toAdd;
        } else {
            throw new Error(ERROR_CODES.get(ERROR_CODES.NOT_FOUND, ENTITIES.APIProject))
        }
    }

    async updateEndpoint(endpId, projId, delta) {
        let proj = await this.getApiProjectById(projId).pipe(first()).toPromise();
        let updated: ApiProject = { ...proj, endpoints: { ...proj.endpoints, [endpId]: { ...proj.endpoints[endpId], ...delta } } };
        return await this.updateAPIProject(updated);
    }

    //Update the API projects when received via sync message
    async updateSyncedProjects(projects: ApiProject[], force: boolean) {
        let updatedIds = await iDB.upsertMany(iDB.TABLES.API_PROJECTS, projects);
        this.updatedViaSync$.next({ type: 'update', ids: updatedIds as string[], forceUpdate: force });
        this.store.dispatch(new ApiProjectsAction.Update(projects));
        return updatedIds;
    }

    async deleteSyncedProjects(ids: string[], force: boolean) {
        await iDB.deleteMany(iDB.TABLES.API_PROJECTS, ids);
        this.updatedViaSync$.next({ type: 'delete', ids, forceUpdate: force });
        this.store.dispatch(new ApiProjectsAction.Delete(ids));
        return ids;
    }

    async onSyncMessage(message: StompMessage) {
        if (!message?.action) return;

        if (message.apiProjects?.length > 0) {
            if (message.action === 'add' || message.action === 'update') {
                const resp = await this.updateSyncedProjects(message.apiProjects, message.force);
                console.info('Sync: added/updated API project', resp)
            }
        } else if (message.idList?.length > 0 && message.action === 'delete') {
            const resp = await this.deleteSyncedProjects(message.idList, message.force);
            console.info('Sync: deleted API project', resp)
        }
        if (message.nonExistant?.apiProjects?.length > 0) {
            const resp = await this.deleteSyncedProjects(message.nonExistant?.apiProjects, message.force);
            console.info('Sync: deleted API project', resp)
        }

        if (message.originalComand?.includes('Fetch:ApiProject')) {
            iDB.upsert(iDB.TABLES.SETTINGS, {
                _id: 'lastSyncedApiProjects',
                time: Date.now()
            });
        }
    }

    //sync any projects those were created before the user even logged in
    async syncApiProjects(hardSync: boolean = false) {
        let projects: ApiProject[] = await iDB.read(iDB.TABLES.API_PROJECTS);
        projects = apic.removeDemoItems(projects);

        //sync API projects created before login
        const projectsBeforeLogin = projects.filter(p => !p.owner);
        if (projectsBeforeLogin.length > 0) {
            this.syncService.execute('syncPreLoginData', { apiProjects: projectsBeforeLogin })
        }

        //sync any projects we may not have in local and any which is in local and deleted in server
        var localProjectsToSyncWithServer = projects.filter(p => p.owner);

        if (hardSync) {
            this.syncService.fetch('Fetch:ApiProject');
        } else {
            var lastSyncedTime = await iDB.findById(iDB.TABLES.SETTINGS, SAVED_SETTINGS.LAST_SYNCED.API_PROJECTS);
            this.syncService.fetch('Fetch:ApiProject', lastSyncedTime?.time, { apiProjects: localProjectsToSyncWithServer.map(p => { return { _id: p._id, _modified: p._modified }; }) })
        }

    }

    async isImportValid(importData) {
        const schema = {
            "type": "object",
            "properties": {
                "TYPE": {
                    "type": "string",
                    "enum": ["APIC Api Project"]
                },
                "value": {
                    "type": "object",
                    "required": ["title", "version"
                    ],
                    "properties": {
                        "title": { "type": "string" },
                        "version": { "type": "string" },
                        "description": { "type": "string" },
                        "contact": {
                            "type": "object",
                            "properties": {
                                "name": { "type": "string" },
                                "url": { "type": "string" },
                                "email": { "type": "string" }
                            }
                        },
                        "folders": { "type": "object" },
                        "models": { "type": "object" },
                        "setting": { "type": "object" },
                        "endpoints": { "type": "object" }
                    }
                }
            },
            "required": ["TYPE", "value"]
        }
        return await this.sandboxService.validateSchema(schema, importData);
    }
    async clear() {
        return await Promise.all([
            iDB.clear(iDB.TABLES.API_PROJECTS),
            iDB.delete(iDB.TABLES.SETTINGS, SAVED_SETTINGS.LAST_SYNCED.API_PROJECTS)
        ]);

    }
    //TODO
    // formatEndpForRun: formatEndpForRun,
    // getTraitNamedResponses: getTraitNamedResponses,
    // getTraitNamedResponsesObj: getTraitNamedResponsesObj
}