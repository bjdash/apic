import { async } from '@angular/core/testing';
import { openDB } from 'idb';

const dbPromise = openDB('apic', 1, {
    upgrade(db) {
        var historyStore = db.createObjectStore('history', { keyPath: '_id' });
        historyStore.createIndex('_time', '_time', { unique: false });
        historyStore.createIndex('_id', '_id', { unique: true });

        var folders = db.createObjectStore('folders', { keyPath: '_id' });
        folders.createIndex('_created', '_created', { unique: false });
        folders.createIndex('name', 'name', { unique: false });
        folders.createIndex('_id', '_id', { unique: true });

        var savedReq = db.createObjectStore('savedRequests', { keyPath: '_id' });
        savedReq.createIndex('_time', '_time', { unique: false });
        savedReq.createIndex('_id', '_id', { unique: true });

        var envs = db.createObjectStore('Environments', { keyPath: '_id' });
        envs.createIndex('_created', '_created', { unique: false });
        envs.createIndex('_id', '_id', { unique: true });

        var projectsStore = db.createObjectStore('Projects', { keyPath: '_id' });
        projectsStore.createIndex('_created', '_created', { unique: false });
        projectsStore.createIndex('_id', '_id', { unique: true });

        var suitesStore = db.createObjectStore('TestSuits', { keyPath: '_id' });
        suitesStore.createIndex('projId', 'projId', { unique: false });
        suitesStore.createIndex('_id', '_id', { unique: true });

        var apiProjsStore = db.createObjectStore('ApiProjects', { keyPath: '_id' });
        apiProjsStore.createIndex('_id', '_id', { unique: true });

        var settingsStore = db.createObjectStore('setting', { keyPath: '_id' });
        settingsStore.createIndex('_id', '_id', { unique: true });

        var table = db.createObjectStore('unsynced', { keyPath: '_id' });
        table.createIndex('_id', '_id', { unique: true });
        table.createIndex('time', 'time', { unique: false });
    },
});

const idbKeyval = {
    async insert(table, value) {
        return (await dbPromise).add(table, value);
    },

    async upsert(table, value) {
        return (await dbPromise).put(table, value);
    },

    async upsertMany(table, values) {

    },

    async read(table) {
        return (await dbPromise).getAll(table);
    },

    async readSorted(table, field, order) {
        if (order === 'asc') {
            return (await dbPromise).getAllFromIndex(table, field);
        } else {
            return (await (await dbPromise).getAllFromIndex(table, field)).reverse();
        }
    },

    async delete(table, id) {
        return (await dbPromise).delete(table, id);
    },

    //TODO: check if the repeat can be avoided
    async deleteMulti(table, ids) {
        var db = await dbPromise;
        return await Promise.all(
            ids.map(id => {
                return db.delete(table, id);
            })
        )
    },

    //TODO: read via specified key
    async findByKey(table, key, value) {
        return (await dbPromise).get(table, value);
    },

    //TODO: Check if extra is used anywhere
    async getByIds(table, key, ids, extra) {
        var db = await dbPromise;
        return await Promise.all(
            ids.map(id => {
                return db.get(table, id);
            })
        )
    },

    async clear(table) {
        return (await dbPromise).clear(table);
    },
};

export default idbKeyval;
