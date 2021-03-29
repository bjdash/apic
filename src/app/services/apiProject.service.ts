import { Select, Store } from '@ngxs/store';
import { Injectable } from '@angular/core';
import Ajv from "ajv";
import { ApiProject } from './../models/ApiProject.model';
import { ApiProjectsAction } from './../actions/apiProject.actions';
import iDB from './IndexedDB';
import apic from '../utils/apic';
import { User } from '../models/User.model'
import { SyncService } from './sync.service';
import { UserState } from '../state/user.state';
import { StompMessage } from '../models/StompMessage.model';

@Injectable()
export class ApiProjectService {
    authUser: User;
    ajv = null;

    constructor(private store: Store, private syncService: SyncService) {
        this.store.select(UserState.getAuthUser).subscribe(user => {
            this.authUser = user;
        });
        this.syncService.onApiProjectMessage$.subscribe(async message => {
            this.onSyncMessage(message);
        })
        this.ajv = new Ajv();
    }

    addProjects(projs: ApiProject[], fromSync?: boolean): Promise<IDBValidKey> {
        if (!fromSync) {
            var ts = new Date().getTime();
            projs.forEach(proj => {
                proj._id = ts + '-' + apic.s12();
                proj._created = ts;
                proj._modified = ts;
                //TODO:
                if (this.authUser?.UID) {
                    proj.owner = this.authUser.UID;
                }
            })
        }
        return iDB.insertMany(iDB.TABLES.API_PROJECTS, projs).then((data: string[]) => {
            if (!fromSync && this.authUser?.UID) {
                this.syncService.prepareAndSync('addAPIProject', projs);
            }
            this.store.dispatch(new ApiProjectsAction.Add(projs));

            //TODO:
            // $rootScope.$emit('refreshProjectReqs', {type:'add', projId:proj._id});
            return data;
        });
    }

    async getApiProjs() {
        const projects = await iDB.read(iDB.TABLES.API_PROJECTS);
        this.store.dispatch(new ApiProjectsAction.Refresh(projects));
        return projects;
    }

    async deleteAPIProjects(ids: string[], fromSync?: boolean) {
        return iDB.deleteMany(iDB.TABLES.API_PROJECTS, ids).then((data) => {
            if (!fromSync) {
                this.syncService.prepareAndSync('deleteAPIProject', ids);
            }
            this.store.dispatch(new ApiProjectsAction.Delete(ids));
            //TODO:
            //$rootScope.$emit('refreshProjectReqs', { type: 'delete', projId: id });
            return data;
        });
    }

    updateAPIProject(project: ApiProject, fromSync?: boolean, preventLeftmenuUpdate?: boolean): Promise<ApiProject> {
        if (!fromSync) {
            project._modified = Date.now();
        }
        return iDB.upsert('ApiProjects', project).then((data) => {
            if (data && !fromSync) {
                var projsToSync = apic.removeDemoItems(project); //returns list
                if (projsToSync.length > 0) {
                    this.syncService.prepareAndSync('updateAPIProject', projsToSync);
                }
            }
            this.store.dispatch(new ApiProjectsAction.Update([project]));
            //TODO
            // if (!preventLeftmenuUpdate) {
            //     if (projects._id) {
            //         $rootScope.$emit('refreshProjectReqs', { type: 'update', projId: projects._id });
            //     } else {
            //         $rootScope.$emit('refreshProjectReqs');
            //     }
            // } else {
            //     $rootScope.$emit('ApiProjChanged');
            // }
            return project;
        });
    }

    updateAPIProjects(projects: ApiProject[], syncRequired?: boolean, preventLeftmenuUpdate?: boolean) {
        if (!syncRequired) {
            projects.forEach(project => project._modified = Date.now());
        }
        return iDB.upsertMany(iDB.TABLES.API_PROJECTS, projects).then((updatedIds) => {
            if (updatedIds && !syncRequired) {
                var projsToSync = apic.removeDemoItems(projects); //returns a list
                if (projsToSync.length > 0) {
                    this.syncService.prepareAndSync('updateAPIProject', projsToSync);
                }
            }
            this.store.dispatch(new ApiProjectsAction.Update(projects));

            //TODO
            // $rootScope.$emit('envUpdated');
            // this.stateTracker.next({ env });
            return updatedIds;
        });
    }

    async onSyncMessage(message: StompMessage) {
        if (!message?.action) return;

        if (message.apiProjects?.length > 0) {
            if (message.action === 'add' || message.action === 'update') {
                const resp = await this.updateAPIProjects(message.apiProjects, true);
                console.log('Sync: added/updated API project', resp)
            }
        } else if (message.idList?.length > 0 && message.action === 'delete') {
            const resp = await this.deleteAPIProjects(message.idList, true);
            console.log('Sync: deleted API project', resp)
        }
        if (message.nonExistant?.apiProjects?.length > 0) {
            const resp = await this.deleteAPIProjects(message.nonExistant?.apiProjects, true);
            console.log('Sync: deleted API project', resp)
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
            var lastSyncedTime = await iDB.findById(iDB.TABLES.SETTINGS, 'lastSyncedApiProjects');
            this.syncService.fetch('Fetch:ApiProject', lastSyncedTime?.time, { apiProjects: localProjectsToSyncWithServer.map(p => { return { _id: p._id, _modified: p._modified }; }) })
        }

    }

    validateImportData(importData) {
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
        const validate = this.ajv.compile(schema);
        const valid = validate(importData);
        if (!valid) console.log(validate.errors);
        return valid;
    }
    //TODO
    // updateAPIProjects: updateAPIProjects,
    // getAPIProjectById: getAPIProjectById,
    // clear: clear,
    // enableMock: enableMock,
    // disableMock: disableMock,
    // formatEndpForRun: formatEndpForRun,
    // importTraitData: importTraitData,
    // updateEndp: updateEndp,
    // getTraitNamedResponses: getTraitNamedResponses,
    // getTraitNamedResponsesObj: getTraitNamedResponsesObj
}