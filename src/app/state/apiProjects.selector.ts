import { createSelector, Selector } from "@ngxs/store";
import { ApiProject } from "../models/ApiProject.model";
import { Utils } from "../services/utils.service";
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
                        examples: {},
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
                        endps: {},
                        examples: {}
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


                project.examples && Object.keys(project.examples).forEach(eId => {
                    const example = project.examples[eId];
                    var exampleX = {
                        _id: example._id,
                        name: example.name
                    };
                    if (leftTree[example.folder]) {
                        leftTree[example.folder].examples[example._id] = exampleX;
                    } else {
                        leftTree.ungrouped.examples[example._id] = exampleX;
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
                        method: endp.method,
                        deprecated: endp.deprecated
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
    static getTesterTree(projects: ApiProject[]) {
        return projects.map(proj => {
            var foldersObj = {};
            var project = {
                name: proj.title,
                children: [],
                desc: '',
                parentId: null,
                requests: [],
                _created: proj._created,
                _id: proj._id,
                _modified: proj._modified
            };
            foldersObj[project._id] = project;
            var subfolders = [];

            if (proj.folders) {
                subfolders = Utils.objectKeys(proj.folders);
            }
            if (subfolders.length > 0) {
                subfolders.forEach((folderKey) => {
                    var f = proj.folders[folderKey];
                    var subFolder = {
                        name: f.name,
                        children: [],
                        desc: f.desc,
                        parentId: project._id,
                        requests: [],
                        _created: proj._created,
                        _id: f._id,
                        _modified: proj._modified
                    }
                    foldersObj[subFolder._id] = subFolder;
                    project.children.push(subFolder);
                })
            }
            //format endpoints
            Utils.objectValues(proj.endpoints).forEach(endpoint => {
                let request = {
                    _id: endpoint._id,
                    method: endpoint.method.toUpperCase(),
                    name: endpoint.summary,
                    url: endpoint.path
                }
                // var formattedEndp = DesignerServ.formatEndpForRun(endpoint, proj);
                // var runObj = DataBuilder.endpointToReqTab(formattedEndp, proj, true);
                // runObj.fromProject = {
                //     projId: project._id,
                //     endpId: endpoint._id
                // };
                if (endpoint.folder && foldersObj[endpoint.folder]) {
                    foldersObj[endpoint.folder].requests.push(request);
                } else {
                    project.requests.push(request);
                }
            })
            return project;
        })
    }

    @Selector([ApiProjectStateSelector.getAll])
    static getByTitle(projects: ApiProject[]) {
        return (title) => {
            return projects.find(project => project.title === title);
        };
    }
}