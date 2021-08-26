import { createSelector, Selector } from "@ngxs/store";
import { Suite } from "../models/Suite.model";
import { TestProject } from "../models/TestProject.model";
import { SuitesState, SuitesStateModel } from "./suites.state";

export class SuitesStateSelector {
    @Selector([SuitesState])
    static getProjects(state: SuitesStateModel): TestProject[] {
        return state.projects;
    }

    @Selector([SuitesStateSelector.getProjects])
    static getProjectsPartial(projects: TestProject[]): TestProject[] {
        return projects.map(f => (({ _id, name, _created, _modified, owner, team }) => ({ _id, name, _created, _modified, owner, team }))(f));
    }

    @Selector([SuitesStateSelector.getProjects])
    static getProjectById(projects: TestProject[]) {
        return (id) => {
            return projects.find(p => p._id === id);
        };
    }

    @Selector([SuitesState])
    static getSuites(state: SuitesStateModel): Suite[] {
        return state.suites;
    }

    @Selector([SuitesStateSelector.getSuites])
    static getSuitesPartial(suites: Suite[]): Suite[] {
        return suites.map(f => (({ _id, name, _created, _modified, projId, reqs, owner, team }) => ({ _id, name, _created, _modified, projId, reqs, owner, team }))(f));
    }

    @Selector([SuitesStateSelector.getSuites])
    static getSuitesInProject(requests: Suite[]) {
        return (projId) => {
            return requests.filter(p => p.projId === projId);
        };
    }

    @Selector([SuitesStateSelector.getSuites])
    static getSuitesById(suites: Suite[]) {
        return (id) => {
            return suites.find(p => p._id === id);
        };
    }

    //this is to prevent ngxs re running the selector on state change
    static getSuiteByIdDynamic(id: string) {
        return createSelector(
            [SuitesStateSelector.getSuitesById],
            (filterFn: (id: any) => Suite) => {
                return filterFn(id);
            }
        );
    };


    @Selector([SuitesStateSelector.getProjectsPartial, SuitesStateSelector.getSuites])
    static getSuitesTree(projects: TestProject[], suites: Suite[]) {
        return SuitesStateSelector.generateTree(projects, suites)
    }

    // @Selector([SuitesStateSelector.getFolders, SuitesStateSelector.getRequests])
    // static getFoldersTreeById(allFolders: ReqFolder[], allRequests: Suite[]) {
    //     return (folderId) => {
    //         let projects = allFolders.filter(f => f._id == folderId || f.parentId == folderId);
    //         let includedFolderIds = projects.map(f => f._id);
    //         let requests = allRequests.filter(r => includedFolderIds.includes(r._parent))

    //         return SuitesStateSelector.generateTree(projects, requests)[0]
    //     };
    // }

    private static generateTree(projects: TestProject[], suites: Suite[]) {
        var suiteMap = {}; // map of suites based on the project id
        suites.forEach(r => {
            if (r.projId) {
                if (suiteMap[r.projId]) {
                    suiteMap[r.projId].push(r);
                } else {
                    suiteMap[r.projId] = [r];
                }
            }
        });

        return projects.map(p => {
            return {
                _id: p._id,
                name: p.name,
                owner: p.owner,
                team: p.team,
                suites: suiteMap[p._id] || []
            }
        })
    }
}