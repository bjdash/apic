import { Store } from '@ngxs/store';
import { Injectable } from '@angular/core';
import Ajv from "ajv";
import { ApiProject } from './../models/ApiProject.model';
import { ApiProjectsAction } from './../actions/apiProject.actions';
import iDB from './IndexedDB';
import apic from '../utils/apic';
import User from '../models/User'
import { SyncService } from './sync.service';

@Injectable()
export class ApiProjectService {
    ajv = null;
    constructor(private store: Store, private syncService: SyncService) {
        this.ajv = new Ajv();
    }

    addProject(proj: ApiProject, fromSync?: boolean): Promise<IDBValidKey> {
        var ts = new Date().getTime();
        proj._id = ts + '-' + apic.s12();
        proj._created = ts;
        proj._modified = ts;
        //TODO:
        if (User.userData && User.userData.UID) {
            proj.owner = User.userData.UID;
        }
        return iDB.insert('ApiProjects', proj).then((data) => {
            if (!fromSync) {
                this.syncService.prepareAndSync('addAPIProject', proj);
            }
            this.store.dispatch(new ApiProjectsAction.Add([proj]));

            //TODO:
            // $rootScope.$emit('refreshProjectReqs', {type:'add', projId:proj._id});
            return data;
        });
    }

    async getApiProjs() {
        const projects = await iDB.read('ApiProjects');
        this.store.dispatch(new ApiProjectsAction.Refresh(projects));
        return projects;
    }

    async deleteAPIProject(id, fromSync?: boolean) {
        return iDB.delete('ApiProjects', id).then((data) => {
            if (!fromSync) {
                this.syncService.prepareAndSync('deleteAPIProject', id);
            }
            this.store.dispatch(new ApiProjectsAction.Delete(id));
            //TODO:
            //$rootScope.$emit('refreshProjectReqs', { type: 'delete', projId: id });
            return data;
        });
    }

    updateAPIProject(project: ApiProject, fromSync?: boolean, preventLeftmenuUpdate?: boolean) {
        project._modified = Date.now();
        return iDB.upsert('ApiProjects', project).then((data) => {
            if (data && !fromSync) {
                var projsToSync = apic.removeDemoItems(project); //returns list
                if (projsToSync.length > 0) {
                    this.syncService.prepareAndSync('updateAPIProject', projsToSync);
                }
                this.store.dispatch(new ApiProjectsAction.Update([project]));
            }
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
            return data;
        });
    }

    updateAPIProjects(projects: ApiProject[], fromSync?: boolean, preventLeftmenuUpdate?: boolean) {
        return iDB.upsertMany(iDB.TABLES.API_PROJECTS, projects).then((updatedIds) => {
            if (updatedIds && !fromSync) {
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