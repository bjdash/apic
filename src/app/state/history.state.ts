import { Injectable } from "@angular/core";
import { Action, Selector, State, StateContext } from "@ngxs/store";
import { ReqHistoryAction } from "../actions/reqHistory.actions";
import { HistoryRequest } from "../models/ReqHistory.model";
import { Utils } from "../services/utils.service";

export class ReqHistoryStateModel {
    history: HistoryRequest[];
}

@State<ReqHistoryStateModel>({
    name: 'History',
    defaults: {
        history: []
    }
})
@Injectable()
export class ReqHistoryState {
    @Selector()
    static getAll(state: ReqHistoryStateModel) {
        return state.history;
    }

    @Selector([ReqHistoryState.getAll])
    static getFormatted(history: HistoryRequest[]): { [key: string]: HistoryRequest[] } {
        var datedHistory: { [key: string]: HistoryRequest[] } = {};
        history.forEach(entry => {
            var date = Utils.formatDate(entry._time);
            if (!datedHistory[date]) datedHistory[date] = [];
            datedHistory[date].push(entry);
        })
        Utils.objectEntries(datedHistory).forEach(([key, val]) => {
            datedHistory[key] = val.sort((a, b) => b._time - a._time)
        })
        return datedHistory;
    }

    @Action(ReqHistoryAction.Add)
    add({ getState, patchState }: StateContext<ReqHistoryStateModel>, { payload }: ReqHistoryAction.Add) {
        const state = getState();
        patchState({
            history: [...state.history, ...payload]
        })
    }

    @Action(ReqHistoryAction.Refresh)
    refresh({ patchState }: StateContext<ReqHistoryStateModel>, { payload }: ReqHistoryAction.Refresh) {
        patchState({
            history: [...payload]
        })
    }

    @Action(ReqHistoryAction.Delete)
    delete({ patchState, getState }: StateContext<ReqHistoryStateModel>, { payload }: ReqHistoryAction.Delete) {
        const history = getState().history;
        patchState({
            history: history.filter(p => !payload.includes(p._id))
        })
    }

    @Action(ReqHistoryAction.Clear)
    clear({ patchState, getState }: StateContext<ReqHistoryStateModel>) {
        patchState({
            history: []
        })
    }
}