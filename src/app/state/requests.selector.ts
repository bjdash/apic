import { createSelector, Selector } from "@ngxs/store"
import { ReqFolder } from "../models/ReqFolder.model";
import { ApiRequest } from "../models/Request.model";
import { RequestsState, RequestsStateModel } from "./requests.state"

export class RequestsStateSelector {

    @Selector([RequestsState])
    static getFolders(state: RequestsStateModel): ReqFolder[] {
        return state.folders;
    }

    @Selector([RequestsStateSelector.getFolders])
    static getFoldersPartial(folders: ReqFolder[]): ReqFolder[] {
        return folders.map(f => (({ _id, name, _created, _modified, parentId }) => ({ _id, name, _created, _modified, parentId }))(f));
    }

    @Selector([RequestsStateSelector.getFolders])
    static getFolderById(folders: ReqFolder[]) {
        return (id) => {
            return folders.find(p => p._id === id);
        };
    }

    @Selector([RequestsStateSelector.getRequests])
    static getReqsPartial(reqs: ApiRequest[]): ApiRequest[] {
        return reqs.map(f => (({ _id, name, _created, _modified, method, _parent, url, type }) => ({ _id, name, _created, _modified, method, _parent, url, type }))(f));
    }

    @Selector([RequestsState])
    static getRequests(state: RequestsStateModel): ApiRequest[] {
        return state.requests;
    }

    @Selector([RequestsStateSelector.getRequests])
    static getRequestsInFolder(requests: ApiRequest[]) {
        return (parentId) => {
            return requests.filter(p => p._parent === parentId);
        };
    }

    @Selector([RequestsStateSelector.getRequests])
    static getRequestById(requests: ApiRequest[]) {
        return (id) => {
            return requests.find(p => p._id === id);
        };
    }

    //this is to prevent ngxs re running the selector on state change
    static getRequestByIdDynamic(id: string) {
        return createSelector(
            [RequestsStateSelector.getRequestById],
            (filterFn: (id: any) => ApiRequest) => {
                return filterFn(id);
            }
        );
    };


    @Selector([RequestsStateSelector.getFoldersPartial, RequestsStateSelector.getReqsPartial])
    static getFoldersTree(folders: ReqFolder[], reqs: ApiRequest[]) {
        return RequestsStateSelector.generateTree(folders, reqs)
    }

    @Selector([RequestsStateSelector.getFolders, RequestsStateSelector.getRequests])
    static getFoldersTreeById(allFolders: ReqFolder[], allRequests: ApiRequest[]) {
        return (folderId) => {
            let folders = allFolders.filter(f => f._id == folderId || f.parentId == folderId);
            let includedFolderIds = folders.map(f => f._id);
            let requests = allRequests.filter(r => includedFolderIds.includes(r._parent))

            return RequestsStateSelector.generateTree(folders, requests)[0]
        };
    }

    private static generateTree(folders: ReqFolder[], reqs: ApiRequest[]) {
        // console.log('generating left tree', folders, reqs);
        var reqMap = {}; // map of requests based on the parent id
        reqs.forEach(r => {
            if (r._parent) {
                if (reqMap[r._parent]) {
                    reqMap[r._parent].push(r);
                } else {
                    reqMap[r._parent] = [r];
                }
            }
        });

        var folderMap = {};
        let folderTree = folders.filter(f => !f.parentId).map(f => {
            let rootFolder = { ...f, children: [], requests: reqMap[f._id] || [] };
            folderMap[f._id] = rootFolder;
            return rootFolder;
        }).sort((a, b) => {
            return a.name.toLocaleLowerCase() < b.name.toLocaleLowerCase() ? -1 : 1
        });

        folders.filter(f => f.parentId)
            .sort((a, b) => {
                return a.name.toLocaleLowerCase() < b.name.toLocaleLowerCase() ? -1 : 1
            })
            .forEach(f => {
                let folder = { ...f, children: [], requests: reqMap[f._id] || [] };
                folderMap[f.parentId].children.push(folder);
            })
        return folderTree;
    }

}