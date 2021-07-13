import { Injectable } from '@angular/core';
import { Store } from '@ngxs/store';
import Ajv from 'ajv';
import { ReqHistoryAction } from '../actions/reqHistory.actions';
import { HistoryRequest } from '../models/ReqHistory.model';
import apic from '../utils/apic';
import iDB from './IndexedDB';

@Injectable({
    providedIn: 'root'
})
export class ReqHistoryService {
    constructor(private store: Store) { }

    add(reqs: HistoryRequest[]): Promise<IDBValidKey> {
        const now = Date.now();
        const historyReqs: HistoryRequest[] = reqs.map(req => { return { _time: now, ...req, _id: now + '-' + apic.s8() } });
        return iDB.insertMany(iDB.TABLES.HISTORY, historyReqs).then((data: string[]) => {
            this.store.dispatch(new ReqHistoryAction.Add(historyReqs));
            return data;
        });
    }

    async refresh() {
        const history = await iDB.readSorted(iDB.TABLES.HISTORY, '_time', 'desc');
        this.store.dispatch(new ReqHistoryAction.Refresh(history));
        return history;
    }

    async delete(ids: string[]) {
        return iDB.deleteMany(iDB.TABLES.HISTORY, ids).then((data) => { //data doesnt contain deleted ids
            this.store.dispatch(new ReqHistoryAction.Delete(ids));
            return data;
        });
    }

    async clear() {
        await iDB.clear(iDB.TABLES.HISTORY);
        this.store.dispatch(new ReqHistoryAction.Clear())
    }

    validateImportData(importData): boolean {
        const schema = {
            "type": "object",
            "properties": {
                "TYPE": {
                    "type": "string",
                    "enum": ["History"]
                },
                "value": {
                    "type": "object",
                    "properties": {},
                    "required": []
                }
            },
            "required": ["TYPE", "value"]
        }
        let ajv = new Ajv();
        const validate = ajv.compile(schema);
        const valid = validate(importData);
        if (!valid) console.error(validate.errors);
        return valid as boolean;
    }
}
