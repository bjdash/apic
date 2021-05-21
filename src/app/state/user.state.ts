import { Injectable } from "@angular/core";
import { Action, Selector, State, StateContext } from "@ngxs/store";
import { UserAction } from "../actions/user.action";
import { User } from "../models/User.model";
import LocalStore from "../services/localStore";

export class UserStateModel {
    authUser: User
}

@State<UserStateModel>({
    name: 'User',
    defaults: {
        authUser: null
    }
})
@Injectable()
export class UserState {
    @Selector()
    static getAuthUser(state: UserStateModel) {
        return state.authUser
    }

    @Action(UserAction.Set)
    set({ setState }: StateContext<UserStateModel>, { payload }: UserAction.Set) {
        setState({
            authUser: payload
        });
        LocalStore.setMany({
            [LocalStore.UID]: payload.UID,
            [LocalStore.ID]: payload.id,
            [LocalStore.EMAIL]: payload.email,
            [LocalStore.NAME]: payload.name,
            [LocalStore.VERIFIED]: payload.verified,
            [LocalStore.AUTH_TOKEN]: payload.authToken
        });
    }

    @Action(UserAction.Update)
    update({ getState, patchState }: StateContext<UserStateModel>, { payload }: UserAction.Update) {
        const authUser = getState().authUser;
        patchState({
            authUser: { ...authUser, ...payload }
        })
    }

    @Action(UserAction.RefreshFromLocal)
    refresh({ getState, patchState }: StateContext<UserStateModel>) {
        const authUser = getState().authUser;
        const { UID, id, email, name, verified, authToken }
            = LocalStore.getMany([LocalStore.UID, LocalStore.ID, LocalStore.EMAIL, LocalStore.NAME, LocalStore.VERIFIED, LocalStore.AUTH_TOKEN]);
        if (UID) {
            patchState({
                authUser: { ...authUser, UID, id, email, name, verified, authToken }
            })
        }
    }

    @Action(UserAction.Clear)
    clear({ getState, patchState }: StateContext<UserStateModel>) {
        const authUser = getState().authUser;
        patchState({
            authUser: null
        })
    }
}