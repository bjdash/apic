import { Selector } from "@ngxs/store"
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
        return reqs.map(f => (({ _id, name, _created, _modified, method, _parent, url }) => ({ _id, name, _created, _modified, method, _parent, url }))(f));
    }

    @Selector([RequestsState])
    static getRequests(state: RequestsStateModel): ApiRequest[] {
        return state.requests;
    }


    @Selector([RequestsStateSelector.getFoldersPartial, RequestsStateSelector.getReqsPartial])
    static getFoldersTree(folders: ReqFolder[], reqs: ApiRequest[]) {
        console.log('generating left tree', folders, reqs);
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

        var folderMap = {}, folderTree = [];
        folders.filter(f => !f.parentId).forEach(f => {
            let rootFolder = { ...f, children: [], requests: reqMap[f._id] };
            folderMap[f._id] = rootFolder;
            folderTree.push(rootFolder)
        });

        folders.filter(f => f.parentId).forEach(f => {
            let folder = { ...f, children: [], requests: reqMap[f._id] };
            folderMap[f.parentId].children.push(folder);
        })
        return folderTree;
    }
}