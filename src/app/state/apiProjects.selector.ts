import { createSelector, Selector } from "@ngxs/store";
import { ApiProject, LeftTreeItem } from "../models/ApiProject.model";
import { Utils } from "../services/utils.service";
import { ApiProjectState, ApiProjectStateModel } from "./apiProjects.state";

export class ApiProjectStateSelector {
  @Selector([ApiProjectState])
  static getPartial(state: ApiProjectStateModel) {
    return state.projects.map(p => { return ({ _id: p._id, title: p.title, publishedId: p.publishedId, owner: p.owner, created: p._created, modified: p._modified }) })
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
      (filterFn: (id: any) => ApiProject): LeftTreeItem[] => {
        var project = filterFn(id);
        var leftTree: { [key: string]: LeftTreeItem } = {
          'ungrouped': {
            _id: 'ungrouped',
            name: "Ungrouped",
            children: []
          }
        }

        if (!project) return Utils.objectValues(leftTree);

        project.folders && Utils.objectValues(project.folders).forEach((folder) => {
          leftTree[folder._id] = {
            _id: folder._id,
            name: folder.name,
            children: []
          };
        });

        project.models && Utils.objectValues(project.models).forEach(model => {
          let folderId = leftTree[model.folder]?._id || 'ungrouped';
          leftTree[folderId].children.push({
            _id: model._id,
            name: model.name,
            type: 'models',
            label: 'MODEL', desc: model.nameSpace
          })
        });

        project.examples && Utils.objectValues(project.examples).forEach(example => {
          let folderId = leftTree[example.folder]?._id || 'ungrouped';
          leftTree[folderId].children.push({
            _id: example._id,
            name: example.name,
            type: 'examples',
            label: 'EXAMPLE',
            desc: `${example.summary || ''} ${example.description || ''}`
          })
        });

        project.traits && Utils.objectValues(project.traits).forEach(trait => {
          let folderId = leftTree[trait.folder]?._id || 'ungrouped';
          leftTree[folderId].children.push({
            _id: trait._id,
            name: trait.name,
            type: 'traits',
            label: 'TRAIT',
            desc: trait.summary || ''
          })
        });

        project.endpoints && Utils.objectValues(project.endpoints).forEach(endp => {
          let folderId = leftTree[endp.folder]?._id || 'ungrouped';
          leftTree[folderId].children.push({
            _id: endp._id,
            name: endp.summary,
            label: endp.method.toUpperCase(),
            deprecated: endp.deprecated,
            type: 'endpoints',
            desc: endp.description || ''
          })
        });

        return Utils.objectValues(leftTree);
      }
    );
  }

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
