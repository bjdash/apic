import { openDB } from 'idb';

const TABLES = {
  HISTORY: 'history',
  FOLDERS: 'folders',
  SAVED_REQUESTS: 'savedRequests',
  ENVIRONMENTS: 'Environments',
  TEST_PROJECTS: 'Projects',//Test projects //TODO: Use migration to rename this table
  TEST_SUITES: 'TestSuits',
  API_PROJECTS: 'ApiProjects',
  SETTINGS: 'setting',
  UNSYNCED: 'unsynced'
}

const dbPromise = openDB('apic', 11, {
  upgrade(db) {
    var historyStore = db.createObjectStore(TABLES.HISTORY, { keyPath: '_id' });
    historyStore.createIndex('_time', '_time', { unique: false });
    historyStore.createIndex('_id', '_id', { unique: true });

    var folders = db.createObjectStore(TABLES.FOLDERS, { keyPath: '_id' });
    folders.createIndex('_created', '_created', { unique: false });
    folders.createIndex('name', 'name', { unique: false });
    folders.createIndex('_id', '_id', { unique: true });

    var savedReq = db.createObjectStore(TABLES.SAVED_REQUESTS, { keyPath: '_id' });
    savedReq.createIndex('_time', '_time', { unique: false });
    savedReq.createIndex('_id', '_id', { unique: true });

    var envs = db.createObjectStore(TABLES.ENVIRONMENTS, { keyPath: '_id' });
    envs.createIndex('_created', '_created', { unique: false });
    envs.createIndex('_id', '_id', { unique: true });

    var projectsStore = db.createObjectStore(TABLES.TEST_PROJECTS, { keyPath: '_id' });
    projectsStore.createIndex('_created', '_created', { unique: false });
    projectsStore.createIndex('_id', '_id', { unique: true });

    var suitesStore = db.createObjectStore(TABLES.TEST_SUITES, { keyPath: '_id' });
    suitesStore.createIndex('projId', 'projId', { unique: false });
    suitesStore.createIndex('_id', '_id', { unique: true });

    var apiProjsStore = db.createObjectStore(TABLES.API_PROJECTS, { keyPath: '_id' });
    apiProjsStore.createIndex('_id', '_id', { unique: true });

    var settingsStore = db.createObjectStore(TABLES.SETTINGS, { keyPath: '_id' });
    settingsStore.createIndex('_id', '_id', { unique: true });

    var table = db.createObjectStore(TABLES.UNSYNCED, { keyPath: '_id' });
    table.createIndex('_id', '_id', { unique: true });
    table.createIndex('time', 'time', { unique: false });
  },
});

const idbKeyval = {
  TABLES,
  async insert(table, value) {
    return (await dbPromise).add(table, value);
  },

  async insertMany(table, values: any[]) {
    var tx = (await dbPromise).transaction(table, 'readwrite');
    var transactions: Promise<any>[] = [
      ...values.map(val => tx.store.add(val)),
      tx.done
    ]
    var insertedIds = (await Promise.all(transactions));
    return insertedIds.filter(id => id != undefined);
  },

  //TODO: Check if insert if not exist works
  async upsert(table, value) {
    return (await dbPromise).put(table, value);
  },

  async upsertMany(table, values: any[]) {
    var db = await dbPromise;
    return await Promise.all(
      values.map((value) => {
        return db.put(table, value);
      })
    );
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

  async deleteMany(table, ids: string[]) {
    var tx = (await dbPromise).transaction(table, 'readwrite');
    var transactions: Promise<any>[] = [
      ...ids.map(id => tx.store.delete(id)),
      tx.done
    ]
    var insertedIds = (await Promise.all(transactions));
    return insertedIds.filter(id => id != undefined);
  },

  //TODO: check if the repeat can be avoided
  async deleteMulti(table, ids) {
    var db = await dbPromise;
    return await Promise.all(
      ids.map((id) => {
        return db.delete(table, id);
      })
    );
  },

  async findById(table, value) { //this is only find by _id
    return (await dbPromise).get(table, value);
  },
  async findByKey(table, key, value) {
    return (await dbPromise).getFromIndex(table, key, value);
  },

  //TODO: Check if extra is used anywhere
  async getByIds(table, key, ids, extra) {
    var db = await dbPromise;
    return await Promise.all(
      ids.map((id) => {
        return db.get(table, id);
      })
    );
  },

  async clear(table) {
    return (await dbPromise).clear(table);
  },
};

export default idbKeyval;
