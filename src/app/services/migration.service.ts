import { Injectable } from "@angular/core";
import LocalStore from "./localStore";
import { Utils } from "./utils.service";
import iDB from './IndexedDB';
import { ApiRequest } from "../models/Request.model";
import { CompiledApiRequest } from "../models/CompiledRequest.model";
import { RequestRunnerService } from "./request-runner.service";
import { HistoryRequest } from "../models/ReqHistory.model";
import { RequestUtils } from "../utils/request.util";

@Injectable()
export class MigrationService {
    migrations = [{
        conditions: [{
            on: 'newVersion',
            check: 'isVersionEqual',
            value: '3.0.0'
        }, {
            on: 'oldVersion',
            check: 'isVersionLower',
            value: '3.0.0'
        }],
        action: async () => {
            // let allHistory = await iDB.read(iDB.TABLES.HISTORY);
            // let migrated: HistoryRequest[] = allHistory?.map(r => {
            //     return { ...RequestUtils.getCompiledRequest(r), _time: r._time }
            // });
            // await iDB.upsertMany(iDB.TABLES.HISTORY, migrated);
            // console.log(allHistory, migrated);
        }
    }];
    newVersion: string;
    oldVersion: string;

    async migrate(newVesrion: string, oldVersion: string) {
        this.newVersion = newVesrion;
        this.oldVersion = oldVersion;
        console.log('Migrationg');
        let migrations = [], promises = [];

        this.migrations.forEach(m => {
            let conditions = m.conditions;
            let isApplicable = conditions.map(c => {
                return this[c.check].call(this, this[c.on], c.value)
            }).every(e => e);
            if (isApplicable) {
                migrations.push(m.action);
            }
        });

        migrations.forEach(action => {
            promises.push(action.call(this, newVesrion, oldVersion));
        })

        await Promise.all(promises);
        console.log('done m');

        //TODO:
        this.onDone(newVesrion, this.oldVersion);
    }

    onDone(newVesrion: string, oldVersion: string) {
        if (this.oldVersion && this.isVersionHigher(newVesrion, oldVersion)) {
            Utils.notify('APIC Updated', 'Apic has been updated to a new version (' + newVesrion + ').', 'https://apic.app/changelog.html');
        }
        LocalStore.set(LocalStore.VERSION, newVesrion);
    }

    isVersionEqual(version: string, toCompare: string): boolean {
        return version === toCompare;
    }

    isVersionLower(version: string, toCompare: string): boolean {
        if (!version) return false;
        var v1parts = version.split('.').map(Number),
            v2parts = toCompare.split('.').map(Number);

        for (var i = 0; i < v1parts.length; ++i) {
            if (v2parts.length == i) {
                return false;
            }

            if (v1parts[i] == v2parts[i]) {
                continue;
            }
            else if (v1parts[i] > v2parts[i]) {
                return false;
            }
            else {
                return true;
            }
        }

        if (v1parts.length != v2parts.length) {
            return true;
        }

        return false;
    }

    isVersionHigher(version: string, toCompare: string): boolean {
        return !this.isVersionEqual(version, toCompare) && !this.isVersionLower(version, toCompare);
    }
}