import { AddEnvs, RefreshEnvs, DeleteEnv, UpdateEnvs } from './../actions/envs.action';
import { Env } from './../models/Envs.model';
import { State, Action, StateContext, Selector } from '@ngxs/store';
import { Injectable } from '@angular/core';

// Section 2
export class EnvStateModel {
    envs: Env[];
}

// Section 3
@State<EnvStateModel>({
    name: 'Envs',
    defaults: {
        envs: []
    }
})
@Injectable()
export class EnvState {

    @Selector()
    static getAll(state: EnvStateModel) {
        return state.envs;
    }

    @Selector()
    static getById(state: EnvStateModel) {
        return (id) => { return state.envs.find(p => p._id === id); };
    }

    @Action(AddEnvs)
    add({ getState, patchState }: StateContext<EnvStateModel>, { payload }: AddEnvs) {
        const state = getState();
        patchState({
            envs: [...state.envs, ...payload]
        })
    }

    @Action(RefreshEnvs)
    refresh({ patchState }: StateContext<EnvStateModel>, { payload }: RefreshEnvs) {
        patchState({
            envs: [...payload]
        })
    }

    @Action(DeleteEnv)
    delete({ patchState, getState }: StateContext<EnvStateModel>, { payload }: DeleteEnv) {
        const envs = getState().envs;
        patchState({
            envs: envs.filter(p => p._id != payload)
        })
    }

    @Action(UpdateEnvs)
    update({ patchState, getState }: StateContext<EnvStateModel>, { payload }: UpdateEnvs) {
        const envs = getState().envs;
        payload.forEach(updatedEnv => {
            const index = envs.findIndex(e => e._id === updatedEnv._id);
            envs[index] = updatedEnv;
        })
        patchState({
            envs: [...envs]
        })
    }


}