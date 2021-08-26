import { Injectable } from "@angular/core";
import { Action, State, StateContext } from "@ngxs/store";
import { SuitesAction } from "../actions/suites.action";
import { Suite } from "../models/Suite.model";
import { TestProject } from "../models/TestProject.model";

export class SuitesStateModel {
    projects: TestProject[];
    suites: Suite[]
}

@State<SuitesStateModel>({
    name: 'TestSuites',
    defaults: {
        projects: [],
        suites: []
    }
})
@Injectable()
export class SuitesState {
    @Action(SuitesAction.Project.Add)
    addProject({ getState, patchState }: StateContext<SuitesStateModel>, { payload }: SuitesAction.Project.Add) {
        const state = getState();
        patchState({
            projects: [...state.projects, ...payload]
        })
    }

    @Action(SuitesAction.Project.Refresh)
    refreshProjects({ patchState }: StateContext<SuitesStateModel>, { payload }: SuitesAction.Project.Refresh) {
        patchState({
            projects: [...payload]
        })
    }

    @Action(SuitesAction.Project.Delete)
    deleteProjects({ patchState, getState }: StateContext<SuitesStateModel>, { payload }: SuitesAction.Project.Delete) {
        const projects = getState().projects;
        patchState({
            projects: projects.filter(f => !payload.includes(f._id))
        })
    }

    @Action(SuitesAction.Project.Update)
    updateProjects({ patchState, getState }: StateContext<SuitesStateModel>, { payload }: SuitesAction.Project.Update) {
        const projects = [...getState().projects];
        var updateSuitesuired = false;
        payload.forEach(updated => {
            const index = projects.findIndex(e => e._id === updated._id);
            if (index < 0) {
                updateSuitesuired = true;
                projects.push(updated);
            } else if (projects[index]._modified != updated._modified) { //if the project being updated hasn't changed then dont update state
                updateSuitesuired = true;
                projects[index] = updated;
            }
        })
        if (updateSuitesuired) {
            patchState({
                projects: [...projects]
            })
        }
    }

    @Action(SuitesAction.Suites.Add)
    addSuites({ getState, patchState }: StateContext<SuitesStateModel>, { payload }: SuitesAction.Suites.Add) {
        const state = getState();
        patchState({
            suites: [...state.suites, ...payload]
        })
    }

    @Action(SuitesAction.Suites.Refresh)
    refreshSuites({ patchState }: StateContext<SuitesStateModel>, { payload }: SuitesAction.Suites.Refresh) {
        patchState({
            suites: [...payload]
        })
    }

    @Action(SuitesAction.Suites.Delete)
    deleteSuites({ patchState, getState }: StateContext<SuitesStateModel>, { payload }: SuitesAction.Suites.Delete) {
        const reqs = getState().suites;
        patchState({
            suites: reqs.filter(f => !payload.includes(f._id))
        })
    }

    @Action(SuitesAction.Suites.Update)
    updateSuites({ patchState, getState }: StateContext<SuitesStateModel>, { payload }: SuitesAction.Suites.Update) {
        const reqs = [...getState().suites];
        var updateSuitesuired = false;
        payload.forEach(updated => {
            const index = reqs.findIndex(e => e._id === updated._id);
            if (index < 0) {
                updateSuitesuired = true;
                reqs.push(updated);
            } else if (reqs[index]._modified != updated._modified) { //if the request being updated hasn't changed then dont update state
                updateSuitesuired = true;
                reqs[index] = updated;
            }
        })
        if (updateSuitesuired) {
            patchState({
                suites: [...reqs]
            })
        }
    }
}