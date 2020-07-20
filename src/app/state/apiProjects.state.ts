import { State, Action, StateContext, Selector } from '@ngxs/store';
import { ApiProject } from './../models/ApiProject.model';
import { AddApiProjects, RefreshApiProjects, DeleteApiProject, UpdateApiProjects } from './../actions/apiProject.actions';
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
        return state.projects.map(p => { return { _id: p._id, title: p.title } })
    }

    @Selector()
    static getAll(state: ApiProjectStateModel) {
        return state.projects;
    }

    @Selector()
    static getById(state: ApiProjectStateModel) {
        return (id) => { return state.projects.find(p => p._id === id); };
    }

    @Action(AddApiProjects)
    add({ getState, patchState }: StateContext<ApiProjectStateModel>, { payload }: AddApiProjects) {
        const state = getState();
        patchState({
            projects: [...state.projects, ...payload]
        })
    }

    @Action(RefreshApiProjects)
    refresh({ patchState }: StateContext<ApiProjectStateModel>, { payload }: RefreshApiProjects) {
        patchState({
            projects: [...payload]
        })
    }

    @Action(DeleteApiProject)
    delete({ patchState, getState }: StateContext<ApiProjectStateModel>, { payload }: DeleteApiProject) {
        const projects = getState().projects;
        patchState({
            projects: projects.filter(p => p._id != payload)
        })
    }

    @Action(UpdateApiProjects)
    update({ patchState, getState }: StateContext<ApiProjectStateModel>, { payload }: UpdateApiProjects) {
        const projects = getState().projects;
        payload.forEach(updated => {
            const index = projects.findIndex(e => e._id === updated._id);
            projects[index] = updated;
        })
        patchState({
            projects: [...projects]
        })
    }

}