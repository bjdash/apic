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

    @Selector()
    static getPartial(state: ApiProjectStateModel) {
        return state.projects.map(p => { return ({ _id: p._id, title: p.title } as ApiProject) })
    }

    @Selector()
    static getAll(state: ApiProjectStateModel) {
        return state.projects;
    }

    @Selector()
    static getById(state: ApiProjectStateModel) {
        return (id) => {
            const project = state.projects.find(p => p._id === id);
            return project ? Object.assign({}, project) : null;
        };
    }

    @Selector()
    static getByTitle(state: ApiProjectStateModel) {
        return (title) => {
            const project = state.projects.find(project => project.title === title);
            return project ? Object.assign({}, project) : null;
        };
    }

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
        payload.forEach(updated => {
            const index = projects.findIndex(e => e._id === updated._id);
            if (index < 0) {
                projects.push(updated);
            } else {
                projects[index] = updated;
            }
        })
        patchState({
            projects: [...projects]
        })
    }

}