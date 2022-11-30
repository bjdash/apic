import { Injectable } from "@angular/core";
import LocalStore from "./localStore";
import { Utils } from "./utils.service";
import iDB from './IndexedDB';
import { RequestsService } from "./requests.service";
import { ApiProjectService } from "./apiProject.service";
import { ApiEndp, ApiProject, ApiResponse, EndpBody } from "../models/ApiProject.model";
import { METHOD_WITH_BODY } from "../utils/constants";
import { SuiteService } from "./suite.service";
import { ApiRequest } from "../models/Request.model";
import { Suite } from "../models/Suite.model";

@Injectable()
export class MigrationService {
    migrations = [{
        name: 'OAS3: Modify request & response to support OAS3',
        conditions: [{
            on: 'oldVersion',
            check: 'isVersionLower',
            value: '3.1.1'
        }, {
            on: 'oldVersion',
            check: 'isVersionHigher',
            value: '0.0.0'
        }],
        action: async () => {
            //migrate to OAS3 response and body type
            let allProjects: ApiProject[] = await iDB.read(iDB.TABLES.API_PROJECTS);
            let migrated: ApiProject[] = allProjects
                .map(proj => {
                    proj.endpoints = Utils.objectValues(proj.endpoints).map(endpoint => {
                        let { produces, consumes, responses, body, ...rest } = endpoint as any;
                        //update responses
                        if (!produces || produces?.length === 0) {
                            produces = ['application/json']
                        }
                        let updatedResponses: ApiResponse[];
                        if (responses.length > 0 && !(responses[0]?.data instanceof Array)) {
                            console.log('Updating endpoint response.');
                            updatedResponses = this.migrations[0].transform(responses, produces);
                        } else {
                            //response is already updated
                            console.log('Endpoint response already updated. ');
                            updatedResponses = responses;
                        }

                        //update body
                        if (!consumes || consumes?.length === 0) {
                            consumes = ['application/json']
                        }
                        let updatedBody: EndpBody = body;
                        if (METHOD_WITH_BODY.includes(endpoint.method.toUpperCase())) {
                            if (body?.hasOwnProperty('type')) {//old endpoint
                                console.log('Updating endp body.');
                                if (body.type === 'form-data') {
                                    consumes = ['multipart/form-data']
                                }
                                if (body.type === 'x-www-form-urlencoded') {
                                    consumes = ['application/x-www-form-urlencoded']
                                }
                                updatedBody = {
                                    data: consumes.map(c => {
                                        return { schema: body.data, mime: c, examples: [] }
                                    }),
                                    desc: ''
                                }
                            } else {
                                console.log('Endpoint body already updated.');
                            }
                        }
                        return {
                            ...rest,
                            responses: updatedResponses,
                            ...(METHOD_WITH_BODY.includes(endpoint.method.toUpperCase()) && { body: updatedBody })
                        } as ApiEndp;
                    }).reduce((obj, f) => {
                        const key = f._id; return ({ ...obj, [key]: f })
                    }, {})

                    //update trait
                    proj.traits = Utils.objectValues(proj.traits).map(trait => {
                        let { responses, ...rest } = trait as any;
                        let updatedResponses: ApiResponse[];
                        if (responses.length > 0 && !(responses[0]?.data instanceof Array)) {
                            console.log('Updating trait response. ');
                            updatedResponses = this.migrations[0].transform(responses, ['application/json']);
                        } else {
                            //response is already updated
                            console.log('Trait response already updated.');
                            updatedResponses = responses;
                        }

                        return { ...rest, responses: updatedResponses } as ApiEndp;
                    }).reduce((obj, f) => {
                        const key = f._id; return ({ ...obj, [key]: f })
                    }, {})
                    return proj;
                });

            await Promise.all(migrated.map(async (proj) => {
                await this.apiProjectService.updateAPIProject(proj);
            }));

            //migrate saved request responses to OAS3
            let allReqs: ApiRequest[] = await iDB.read(iDB.TABLES.SAVED_REQUESTS);
            let migratedReqs = allReqs.map(req => {
                let respCodes = req.respCodes || [];
                if (respCodes.length > 0 && !(respCodes[0]?.data instanceof Array)) {
                    console.log('Updating saved request');
                    req.respCodes = this.migrations[0].transform(respCodes, ['application/json'], true);
                } else {
                    console.log('Saved request already updated.');
                }
                return req;
            });

            await Promise.all(migratedReqs.map(async (req) => {
                await this.reqService.updateRequest(req);
            }));

            //migrate saved suite request responses to OAS3
            let allSuites: Suite[] = await iDB.read(iDB.TABLES.TEST_SUITES);
            let migratedSuites: Suite[] = allSuites.map(suite => {
                suite.reqs = suite.reqs.map(req => {
                    let respCodes = req.respCodes || [];
                    if (respCodes.length > 0 && !(respCodes[0]?.data instanceof Array)) {
                        console.log('Updating suite request');
                        req.respCodes = this.migrations[0].transform(respCodes, ['application/json'], true);
                    } else {
                        console.log('Suite request already updated.');
                    }
                    return req;
                })
                return suite
            })
            await Promise.all(migratedSuites.map(async (suite) => {
                await this.suiteService.updateSuite(suite);
            }));
        },

        transform: (responses, produces, isSchemaOnly: boolean = false) => {
            return responses.map(oldResp => {
                let { data, examples, ...restOfResponse } = oldResp;
                return {
                    ...restOfResponse,
                    data: produces.map(mime => {
                        return {
                            mime,
                            schema: data,
                            ...(!isSchemaOnly && { examples: examples || [] })
                        }
                    }),
                    ...(!isSchemaOnly && { headers: { type: 'object', properties: {}, required: [] } })
                }
            })
        }
    }];
    newVersion: string;
    oldVersion: string;

    constructor(private apiProjectService: ApiProjectService, private reqService: RequestsService, private suiteService: SuiteService) { }

    async migrate(newVersion: string, oldVersion: string) {
        this.newVersion = newVersion;
        this.oldVersion = oldVersion || '0.0.0';
        console.debug(`From ${this.oldVersion} to ${this.newVersion}`);
        let migrations = [], promises = [];

        this.migrations.forEach(m => {

            let conditions = m.conditions;
            let isApplicable = conditions.map(c => {
                return MigrationService[c.check].call(this, this[c.on], c.value)
            }).every(e => e);
            if (isApplicable) {
                console.debug(`Running migration: ${m.name}`);
                migrations.push(m.action);
            } else {
                console.debug(`Skipping migration: ${m.name}`)
            }
        });

        migrations.forEach(action => {
            promises.push(action.call(this, newVersion, oldVersion));
        })

        await Promise.all(promises);
        console.debug('Migration completed');

        this.onDone(newVersion, this.oldVersion);
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
        return !MigrationService.isVersionEqual(version, toCompare) && !MigrationService.isVersionLower(version, toCompare);
    }
}
