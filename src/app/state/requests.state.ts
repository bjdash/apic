import { Injectable } from "@angular/core";
import { Action, State, StateContext } from "@ngxs/store";
import { RequestsAction } from "../actions/requests.action";
import { ReqFolder } from "../models/ReqFolder.model";
import { ApiRequest } from "../models/Request.model";

export class RequestsStateModel {
    requests: ApiRequest[];
    folders: ReqFolder[]
}

@State<RequestsStateModel>({
    name: 'ApiRequests',
    defaults: {
        requests: [],
        folders: []
    }
})
@Injectable()
export class RequestsState {

    @Action(RequestsAction.Folder.Add)
    add({ getState, patchState }: StateContext<RequestsStateModel>, { payload }: RequestsAction.Folder.Add) {
        const state = getState();
        patchState({
            folders: [...state.folders, ...payload]
        })
    }

    @Action(RequestsAction.Folder.Refresh)
    refresh({ patchState }: StateContext<RequestsStateModel>, { payload }: RequestsAction.Folder.Refresh) {
        patchState({
            folders: [...payload]
        })
    }

    @Action(RequestsAction.Folder.Delete)
    delete({ patchState, getState }: StateContext<RequestsStateModel>, { payload }: RequestsAction.Folder.Delete) {
        const folders = getState().folders;
        patchState({
            folders: folders.filter(f => !payload.includes(f._id))
        })
    }

    @Action(RequestsAction.Folder.Update)
    update({ patchState, getState }: StateContext<RequestsStateModel>, { payload }: RequestsAction.Folder.Update) {
        const folders = [...getState().folders];
        var updateRequired = false;
        payload.forEach(updated => {
            const index = folders.findIndex(e => e._id === updated._id);
            if (index < 0) {
                updateRequired = true;
                folders.push(updated);
            } else if (folders[index]._modified != updated._modified) { //if the project being updated hasn't changed then dont update state
                updateRequired = true;
                folders[index] = updated;
            }
        })
        if (updateRequired) {
            patchState({
                folders: [...folders]
            })
        }
    }

    @Action(RequestsAction.Req.Add)
    addReq({ getState, patchState }: StateContext<RequestsStateModel>, { payload }: RequestsAction.Req.Add) {
        const state = getState();
        patchState({
            requests: [...state.requests, ...payload]
        })
    }

    @Action(RequestsAction.Req.Refresh)
    refreshReq({ patchState }: StateContext<RequestsStateModel>, { payload }: RequestsAction.Req.Refresh) {
        patchState({
            requests: [...payload]
        })
    }

    @Action(RequestsAction.Req.Delete)
    deleteReq({ patchState, getState }: StateContext<RequestsStateModel>, { payload }: RequestsAction.Req.Delete) {
        const reqs = getState().requests;
        patchState({
            requests: reqs.filter(f => !payload.includes(f._id))
        })
    }

    @Action(RequestsAction.Req.Update)
    updateReq({ patchState, getState }: StateContext<RequestsStateModel>, { payload }: RequestsAction.Req.Update) {
        const reqs = [...getState().requests];
        var updateRequired = false;
        payload.forEach(updated => {
            const index = reqs.findIndex(e => e._id === updated._id);
            if (index < 0) {
                updateRequired = true;
                reqs.push(updated);
            } else if (reqs[index]._modified != updated._modified) { //if the project being updated hasn't changed then dont update state
                updateRequired = true;
                reqs[index] = updated;
            }
        })
        if (updateRequired) {
            patchState({
                requests: [...reqs]
            })
        }
    }

}