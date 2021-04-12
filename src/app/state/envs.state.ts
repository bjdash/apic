import { EnvsAction } from './../actions/envs.action';
import { Env, ParsedEnv } from './../models/Envs.model';
import { State, Action, StateContext, Selector, createSelector } from '@ngxs/store';
import { Injectable } from '@angular/core';
import LocalStore from '../services/localStore';
import { KeyVal } from '../models/KeyVal.model';

// Section 2
export class EnvStateModel {
    envs: Env[];
    selectedEnv: Env;
    inMem: {}
}

// Section 3
@State<EnvStateModel>({
    name: 'Envs',
    defaults: {
        envs: [],
        selectedEnv: null,
        inMem: {}
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
    static getSelected(state: EnvStateModel): ParsedEnv {
        if (state.selectedEnv)
            return {
                _id: state.selectedEnv._id,
                name: state.selectedEnv.name,
                vals: state.selectedEnv?.vals.reduce((accumulator, currentValue) => { accumulator[currentValue.key] = currentValue.val; return accumulator }, {}) || {}
            }
        else return null;
    }

    @Selector()
    static getInMemEnv(state: EnvStateModel) {
        return state.inMem;
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
            envs: envs.filter(p => !payload.includes(p._id))
        })
    }

    @Action(EnvsAction.Update)
    update({ patchState, getState }: StateContext<EnvStateModel>, { payload }: EnvsAction.Update) {
        const envs = [...getState().envs];
        let selectedEnv = getState().selectedEnv;
        let shouldUpdateSelected: boolean = false;
        payload.forEach(updatedEnv => {
            const index = envs.findIndex(e => e._id === updatedEnv._id);
            if (index < 0) {
                envs.push(updatedEnv);
            } else {
                if (updatedEnv._id === selectedEnv._id) {
                    shouldUpdateSelected = true;
                    selectedEnv = updatedEnv;
                }
                envs[index] = updatedEnv;
            }
        })
        if (shouldUpdateSelected) {
            patchState({
                envs: [...envs],
                selectedEnv
            })
        } else {
            patchState({
                envs: [...envs]
            })
        }

    }

    @Action(EnvsAction.Select)
    setSelected(ctx: StateContext<EnvStateModel>, { payload }: EnvsAction.Select) {
        const envs = ctx.getState().envs;
        ctx.patchState({ selectedEnv: envs.find(p => p._id === payload) });
        LocalStore.set(LocalStore.LAST_SELECTED_ENV, payload);
    }


}