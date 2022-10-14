import { Injectable } from "@angular/core";
import LocalStore from "./localStore";
import { Utils } from "./utils.service";
import iDB from './IndexedDB';
import { RequestsService } from "./requests.service";

@Injectable()
export class MigrationService {
    migrations = [{
        name: 'Stomp requests: move field connection to stomp',
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
            //migrate Stomp requests
            let allReqs = await iDB.read(iDB.TABLES.SAVED_REQUESTS);
            let migrated = allReqs.filter(r => {
                return r.type == 'ws' && r.method == 'Stomp'
            }).map(r => {
                let newReq = { ...r };
                let stomp = {
                    subscUrl: r.connection.subscUrl,
                    host: r.connection.vhost,
                    login: r.connection.id,
                    passcode: r.connection.psd,
                    headers: r.connection.headers,
                    destQ: r.destQ
                }
                delete newReq.tabId;
                delete newReq.destQ;
                delete newReq.connection;
                newReq.stomp = stomp;
                return newReq;
            })
            await Promise.all(migrated.map(async (req) => {
                await this.requestsService.updateRequest(req);
            }));

        }
    }];
    newVersion: string;
    oldVersion: string;

    constructor(private requestsService: RequestsService) { }

    async migrate(newVesrion: string, oldVersion: string) {
        this.newVersion = newVesrion;
        this.oldVersion = oldVersion || '0.0.0';
        console.debug('Migrating');
        let migrations = [], promises = [];

        this.migrations.forEach(m => {
            console.debug(`Running migration: ${m.name}`);

            let conditions = m.conditions;
            let isApplicable = conditions.map(c => {
                return MigrationService[c.check].call(this, this[c.on], c.value)
            }).every(e => e);
            if (isApplicable) {
                migrations.push(m.action);
            }
        });

        migrations.forEach(action => {
            promises.push(action.call(this, newVesrion, oldVersion));
        })

        await Promise.all(promises);
        console.debug('Migration completed');

        this.onDone(newVesrion, this.oldVersion);
    }

    onDone(newVesrion: string, oldVersion: string) {
        if (this.oldVersion && MigrationService.isVersionHigher(newVesrion, oldVersion)) {
            Utils.notify('APIC Updated', 'Apic has been updated to a new version (' + newVesrion + ').', 'https://apic.app/changelog.html');
        }
        LocalStore.set(LocalStore.VERSION, newVesrion);
    }

    static isVersionEqual(version: string, toCompare: string): boolean {
        return version === toCompare;
    }

    static isVersionLower(version: string, toCompare: string): boolean {
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

    static isVersionHigher(version: string, toCompare: string): boolean {
        return !this.isVersionEqual(version, toCompare) && !this.isVersionLower(version, toCompare);
    }
}
