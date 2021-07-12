import { createSelector, Selector } from "@ngxs/store";
import { ApiProject } from "../models/ApiProject.model";
import { ApiProjectState, ApiProjectStateModel } from "./apiProjects.state";

export class ApiProjectStateSelector {
    @Selector([ApiProjectState])
    static getPartial(state: ApiProjectStateModel) {
        return state.projects.map(p => { return ({ _id: p._id, title: p.title, publishedId: p.publishedId, owner: p.owner } as ApiProject) })
    }

    @Selector([ApiProjectState])
    static getAll(state: ApiProjectStateModel) {
        return state.projects;
    }

    @Selector([ApiProjectStateSelector.getAll])
    static getById(projects: ApiProject[]) {
        return (id) => {
            return projects.find(p => p._id === id);
        };
    }

    //this is to prevent ngxs re running the selector on state change
    static getByIdDynamic(id: string) {
        return createSelector(
            [ApiProjectStateSelector.getById],
            (filterFn: (id: any) => ApiProject) => {
                return filterFn(id);
            }
        );
    };

    static getLeftTree(id: string) {
        return createSelector(
            [ApiProjectStateSelector.getById],
            (filterFn: (id: any) => ApiProject) => {
                var project = filterFn(id);
                var leftTree = {
                    ungrouped: {
                        models: {},
                        traits: {},
                        endps: {},
                        folder: {
                            _id: 'ungrouped',
                            name: "Ungrouped",
                            expand: true
                        }
                    }
                };

                if (!project) return leftTree;

                project.folders && Object.keys(project.folders).forEach(fId => {
                    leftTree[fId] = {
                        folder: { ...project.folders[fId], expand: false },
                        models: {},
                        traits: {},
                        endps: {}
                    };
                })

                project.models && Object.keys(project.models).forEach(mId => {
                    const model = project.models[mId];
                    var modelX = {
                        _id: model._id,
                        name: model.name
                    };
                    if (leftTree[model.folder]) {
                        leftTree[model.folder].models[model._id] = modelX;
                    } else {
                        leftTree.ungrouped.models[model._id] = modelX;
                    }
                });

                project.traits && Object.keys(project.traits).forEach(tId => {
                    const trait = project.traits[tId];
                    var traitX = {
                        _id: trait._id,
                        name: trait.name
                    };
                    if (leftTree[trait.folder]) {
                        leftTree[trait.folder].traits[trait._id] = traitX;
                    } else {
                        leftTree.ungrouped.traits[trait._id] = traitX;
                    }
                });

                project.endpoints && Object.keys(project.endpoints).forEach(eId => {
                    const endp = project.endpoints[eId];
                    var endpX = {
                        _id: endp._id,
                        name: endp.summary,
                        method: endp.method
                    };
                    if (leftTree[endp.folder]) {
                        leftTree[endp.folder].endps[endp._id] = endpX;
                    } else {
                        leftTree.ungrouped.endps[endp._id] = endpX;
                    }
                });


                return leftTree;
            }
        );
    };

    @Selector([ApiProjectStateSelector.getAll])
    static getByTitle(projects: ApiProject[]) {
        return (title) => {
            return projects.find(project => project.title === title);
        };
    }
}