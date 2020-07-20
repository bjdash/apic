import { ApiProject } from './../models/ApiProject.model';
import { AddApiProjects, RefreshApiProjects, DeleteApiProject, UpdateApiProjects } from './../actions/apiProject.actions';
import { Injectable } from '@angular/core';
import { Store } from '@ngxs/store';
import iDB from './IndexedDB';
import apic from '../utils/apic';
import SyncIt from './sync.service'
import User from '../models/User'

@Injectable()
export class ApiProjectService {
    constructor(private store: Store) { }

    addProject(proj: ApiProject, fromSync?: boolean): Promise<IDBValidKey> {
        var ts = new Date().getTime();
        if (!proj._id) {
            proj._id = ts + '-' + apic.s12();
        }
        if (!proj._created) {
            proj._created = ts;
        }
        if (!proj._modified) {
            proj._modified = ts;
        }
        if (User.userData && User.userData.UID) {
            proj.owner = User.userData.UID;
        }
        return iDB.insert('ApiProjects', proj).then((data) => {
            if (!fromSync) {
                SyncIt.prepareAndSync('addAPIProject', proj);
            }
            this.store.dispatch(new AddApiProjects([proj]));

            //TODO:
            // $rootScope.$emit('refreshProjectReqs', {type:'add', projId:proj._id});
            return data;
        });
    }

    async getApiProjs() {
        const projects = await iDB.read('ApiProjects');
        this.store.dispatch(new RefreshApiProjects(projects));
        return projects;
    }

    async deleteAPIProject(id, fromSync?: boolean) {
        return iDB.delete('ApiProjects', id).then((data) => {
            if (!fromSync) {
                SyncIt.prepareAndSync('deleteAPIProject', id);
            }
            this.store.dispatch(new DeleteApiProject(id));
            //TODO:
            //$rootScope.$emit('refreshProjectReqs', { type: 'delete', projId: id });
            return data;
        });
    }

    updateAPIProject(projects: ApiProject, fromSync?: boolean, preventLeftmenuUpdate?: boolean) {
        return iDB.upsert('ApiProjects', projects).then((data) => {
            if (data && !fromSync) {
                var projsToSync = apic.removeDemoItems(projects); //returns list
                if (projsToSync.length > 0) {
                    SyncIt.prepareAndSync('updateAPIProject', projsToSync);
                }
                this.store.dispatch(new UpdateApiProjects([projects]));
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