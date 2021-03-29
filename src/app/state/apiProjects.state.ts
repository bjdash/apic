import { State, Action, StateContext, Selector } from '@ngxs/store';
import { ApiProject } from './../models/ApiProject.model';
import { ApiProjectsAction } from './../actions/apiProject.actions';
import { Injectable } from '@angular/core';

// Section 2
export class ApiProjectStateModel {
    projects: ApiProject[];
}

// Section 3
@State<ApiProjectStateModel>({
    name: 'ApiProjects',
    defaults: {
        projects: []
    }
})
@Injectable()
export class ApiProjectState {

    @Action(ApiProjectsAction.Add)
    add({ getState, patchState }: StateContext<ApiProjectStateModel>, { payload }: ApiProjectsAction.Add) {
        const state = getState();
        patchState({
            projects: [...state.projects, ...payload]
        })
    }

    @Action(ApiProjectsAction.Refresh)
    refresh({ patchState }: StateContext<ApiProjectStateModel>, { payload }: ApiProjectsAction.Refresh) {
        patchState({
            projects: [...payload]
        })
    }

    @Action(ApiProjectsAction.Delete)
    delete({ patchState, getState }: StateContext<ApiProjectStateModel>, { payload }: ApiProjectsAction.Delete) {
        const projects = getState().projects;
        patchState({
            projects: projects.filter(p => !payload.includes(p._id))
        })
    }

    @Action(ApiProjectsAction.Update)
    update({ patchState, getState }: StateContext<ApiProjectStateModel>, { payload }: ApiProjectsAction.Update) {
        const projects = [...getState().projects];
        var updateRequired = false;
        payload.forEach(updated => {
            const index = projects.findIndex(e => e._id === updated._id);
            if (index < 0) {
                updateRequired = true;
                projects.push(updated);
            } else if (projects[index]._modified != updated._modified) { //if the project being updated hasn't changed then dont update state
                updateRequired = true;
                projects[index] = updated;
            }
        })
        if (updateRequired) {
            patchState({
                projects: [...projects]
            })
        }
    }

}