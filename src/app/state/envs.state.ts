import { EnvsAction } from './../actions/envs.action';
import { Env } from './../models/Envs.model';
import { State, Action, StateContext, Selector, createSelector } from '@ngxs/store';
import { Injectable } from '@angular/core';
import LocalStore from '../services/localStore';

// Section 2
export class EnvStateModel {
    envs: Env[];
    selectedEnv: Env
}

// Section 3
@State<EnvStateModel>({
    name: 'Envs',
    defaults: {
        envs: [],
        selectedEnv: null
    }
})
@Injectable()
export class EnvState {
    @Selector()
    static getPartial(state: EnvStateModel) {
        return state.envs.map(p => { return { _id: p._id, name: p.name } })
    }

    @Selector()
    static getAll(state: EnvStateModel) {
        return state.envs.map(env => Object.assign({}, env));
    }

    @Selector()
    static getById(state: EnvStateModel) {
        return (id) => {
            const env = state.envs.find(env => env._id === id);
            return env ? Object.assign({}, env) : null;
        };
    }

    @Selector()
    static getSelected(state: EnvStateModel) {
        return state.selectedEnv;
    }

    @Action(EnvsAction.Add)
    add({ getState, patchState }: StateContext<EnvStateModel>, { payload }: EnvsAction.Add) {
        const state = getState();
        patchState({
            envs: [...state.envs, ...payload]
        })
    }

    @Action(EnvsAction.Refresh)
    refresh({ patchState }: StateContext<EnvStateModel>, { payload }: EnvsAction.Refresh) {
        patchState({
            envs: [...payload]
        });
    }

    @Action(EnvsAction.Delete)
    delete({ patchState, getState }: StateContext<EnvStateModel>, { payload }: EnvsAction.Delete) {
        const envs = getState().envs;
        patchState({
            envs: envs.filter(p => p._id != payload)
        })
    }

    @Action(EnvsAction.Update)
    update({ patchState, getState }: StateContext<EnvStateModel>, { payload }: EnvsAction.Update) {
        const envs = getState().envs;
        payload.forEach(updatedEnv => {
            const index = envs.findIndex(e => e._id === updatedEnv._id);
            envs[index] = updatedEnv;
        })
        patchState({
            envs: [...envs]
        })
    }

    @Action(EnvsAction.Select)
    setSelected(ctx: StateContext<EnvStateModel>, { payload }: EnvsAction.Select) {
        const envs = ctx.getState().envs;
        ctx.patchState({ selectedEnv: envs.find(p => p._id === payload) });
        LocalStore.set(LocalStore.LAST_SELECTED_ENV, payload);
    }


}