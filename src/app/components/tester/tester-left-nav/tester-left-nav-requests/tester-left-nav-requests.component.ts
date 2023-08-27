import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { Select, Store } from '@ngxs/store';
import { Observable, Subject } from 'rxjs';
import { first, map, take, takeUntil } from 'rxjs/operators';
import { LeftMenuTreeSelectorOptn } from 'src/app/components/common/left-menu-tree-selector/left-menu-tree-selector.component';
import { SharingComponent } from 'src/app/components/sharing/sharing.component';
import { ApiProject } from 'src/app/models/ApiProject.model';
import { ReqFolder, LeftTreeFolder } from 'src/app/models/ReqFolder.model';
import { ApiRequest, LeftTreeRequest } from 'src/app/models/Request.model';
import { Suite, SuiteReq } from 'src/app/models/Suite.model';
import { Team } from 'src/app/models/Team.model';
import { User } from 'src/app/models/User.model';
import { AuthService } from 'src/app/services/auth.service';
import { FileSystem } from 'src/app/services/fileSystem.service';
import { RequestsService } from 'src/app/services/requests.service';
import { SharingService } from 'src/app/services/sharing.service';
import { SuiteService } from 'src/app/services/suite.service';
import { Toaster } from 'src/app/services/toaster.service';
import { Utils } from 'src/app/services/utils.service';
import { ApiProjectStateSelector } from 'src/app/state/apiProjects.selector';
import { RequestsStateSelector } from 'src/app/state/requests.selector';
import { SuitesStateSelector } from 'src/app/state/suites.selector';
import { UserState } from 'src/app/state/user.state';
import apic from 'src/app/utils/apic';
import { CustomFilter } from 'src/app/utils/filter.pipe';
import { RequestUtils } from 'src/app/utils/request.util';
import { SaveReqDialogComponent } from '../../save-req-dialog/save-req-dialog.component';
import { TesterTab, TesterTabsService } from '../../tester-tabs/tester-tabs.service';

type ReqIsFrom = 'saved' | 'project'
@Component({
  selector: 'app-tester-left-nav-requests',
  templateUrl: './tester-left-nav-requests.component.html',
  styleUrls: ['./tester-left-nav-requests.component.scss']
})
export class TesterLeftNavRequestsComponent implements OnInit, OnDestroy {
  @Select(RequestsStateSelector.getFoldersTree) folders$: Observable<any[]>;
  @Select(SuitesStateSelector.getSuitesTree) suitesTree$: Observable<any[]>;
  @Select(ApiProjectStateSelector.getTesterTree) projectsTree$: Observable<any[]>

  authUser: User;
  private destroy: Subject<boolean> = new Subject<boolean>();
  selectedTabId: string;
  newFolderForm: FormGroup;
  teams: { [key: string]: Team } = {};
  rename = {
    _id: '',
    name: ''
  }

  copyMoveOption = {
    type: '',
    reqId: '',
    reqName: ''
  }
  treeSelectorOpt: {
    show: boolean,
    items: any[],
    options?: LeftMenuTreeSelectorOptn,
    onDone?: (any) => void,
  } = {
      show: false,
      items: []
    }

  flags = {
    projReqs: true,
    savedReqs: true,
    newFolder: false,
    showSearch: false,
    searchModel: '',
    expanded: {},
    expandAll: false,
    unsharingId: ''
  }
  constructor(fb: FormBuilder,
    private store: Store,
    private reqService: RequestsService,
    private fileSystem: FileSystem,
    private testerTabService: TesterTabsService,
    private dialog: MatDialog,
    private suiteService: SuiteService,
    private authService: AuthService,
    private sharing: SharingService,
    private toastr: Toaster) {
    this.newFolderForm = fb.group({
      name: ['', Validators.required],
      desc: [''],
      parentId: ['', Validators.required]
    });

    this.store.select(UserState.getAuthUser).pipe(takeUntil(this.destroy)).subscribe(user => {
      this.authUser = user;
    });
    this.testerTabService.selectedTabChange.pipe(takeUntil(this.destroy)).subscribe(id => this.selectedTabId = id);
    this.sharing.teams$
      .subscribe(teams => {
        this.teams = Utils.arrayToObj(teams, 'id');
      })
  }
  ngOnDestroy(): void {
    this.destroy.next();
    this.destroy.complete();
  }

  ngOnInit(): void {
  }

  showFolderForm() {
    this.flags.newFolder = true;
    setTimeout(() => {
      document.getElementById('newFolderName').focus();
    }, 0);
  }
  async createFolder() {
    var newFolder = this.newFolderForm.value;
    if (newFolder.parentId === undefined) {
      this.toastr.error('Please select a parent folder.');
      return;
    }
    if (newFolder.parentId === 'root' || !newFolder.parentId) {
      newFolder.parentId = null;
    }

    try {
      await this.reqService.createFolder(newFolder)
      this.toastr.success('Folder "' + newFolder.name + '" created');
      this.newFolderForm.reset();
      this.flags.newFolder = false;
    } catch (e) {
      console.error('Failed to createfolder', e, newFolder)
      this.toastr.error(`Failed to create folder: ${e.message}`);
      document.getElementById('newFolderName').focus();
    }
  }

  showRename(folder: ReqFolder) {
    const { _id, name } = folder;
    this.rename = { _id, name };
    setTimeout(() => {
      document.getElementById('folder_' + folder._id).focus();
    }, 0);
  }
  saveFolderRename() {
    let renameId = this.rename._id;
    this.store.select(RequestsStateSelector.getFolderById)
      .pipe(map(filterFn => filterFn(renameId)))
      .pipe(take(1)).subscribe(async (f: ReqFolder) => {
        if (f) {
          const toSave: ReqFolder = { ...f, name: this.rename.name };
          try {
            await this.reqService.updateFolder(toSave);
            this.toastr.success('Folder renamed');
            this.rename._id = ''
          } catch (e) {
            this.toastr.error(`Failed to rename folder: ${e.message}`);
            document.getElementById('folder_' + this.rename._id).focus();
          }
        }

      });
  }

  async importFolder() {
    const file: any = await this.fileSystem.readFile();
    var data = null;
    try {
      data = JSON.parse(file.data);
    } catch (e) {
      this.toastr.error('Import failed. Invalid file format');
    }
    if (!data)
      return;

    if (data.TYPE === 'Folder') {
      if (await this.reqService.validateImportData(data)) {
        try {
          await this.processImportedFolder(data.value, null);
          this.toastr.success('Import Complete.');
        } catch (e) {
          this.toastr.error(`Failed to import. ${e.message}`);
        }
      } else {
        this.toastr.error('Selected file doesn\'t contain valid Folder information');
      }
    } else {
      this.toastr.error('Selected file doesn\'t contain valid Folder information');
    }
  }

  private async processImportedFolder(folder, parentId: string) {
    var folderToAdd: ReqFolder = {
      name: folder.name,
      desc: folder.desc,
      parentId
    };
    let createdFolder = await this.reqService.createFolder(folderToAdd, true);

    if (folder.children?.length > 0) {
      for (var i = 0; i < folder.children.length; i++) {
        this.processImportedFolder(folder.children[i], createdFolder._id);
      }
    }
    if (folder.requests && folder.requests.length > 0) {
      for (var i = 0; i < folder.requests.length; i++) {
        var req = folder.requests[i];
        var reqToAdd: ApiRequest = {
          url: req.url,
          method: req.method,
          name: req.name,
          description: req.description,
          _parent: createdFolder._id,
        }
        if (req.type === 'ws') {
          reqToAdd = {
            ...reqToAdd,
            type: req.type,
            message: req.message
          };
          if (req.method === 'Websocket') {
            reqToAdd = {
              ...reqToAdd,
            };
          } else if (req.method === 'Stomp') {
            reqToAdd = {
              ...reqToAdd,
              stomp: req.stomp
            };
          } else if (req.method === 'SSE') {
            reqToAdd = {
              ...reqToAdd,
              sse: req.sse
            };
          } else if (req.method === 'Socketio') {
            reqToAdd = {
              ...reqToAdd,
              socketio: req.socketio
            };
          }
        } else {
          reqToAdd = {
            ...reqToAdd,
            prescript: req.prescript,
            postscript: req.postscript,
            Req: req.Req,
            Body: req.Body,
            respCodes: req.respCodes,
            savedResp: req.savedResp
          };
        }
        await this.reqService.createRequest(reqToAdd, true);
      }
    }

  }

  async deleteFolder(folder: LeftTreeFolder) {
    let reqsToDelete = folder.requests?.map(r => r._id) || [];
    let foldersToDelete = folder.children?.map(f => {
      if (f.requests?.length > 0) {
        reqsToDelete = [...reqsToDelete, ...f.requests.map(r => r._id)];
      }
      return f._id
    }) || [];
    foldersToDelete.push(folder._id);
    try {
      await this.reqService.deleteRequests(reqsToDelete, folder.owner);
      await this.reqService.deleteFolders(foldersToDelete, folder.owner);
      this.toastr.success('Folder deleted');
    } catch (e) {
      console.error('Failed to delete folder', e);
      this.toastr.error(`Failed to delete folder ${e.message}`);
    }
  }

  async deleteRequest(id: string, name: string, owner: string) {
    try {
      await this.reqService.deleteRequests([id], owner);
      this.toastr.success('Request deleted');
      this.testerTabService.updateTab(id, 'new_tab:' + apic.s8(), 'Deleted Tab: ' + name);
    } catch (e) {
      console.error('Failed to delete request', e);
      this.toastr.error(`Failed to delete request: ${e.message}`)
    }
  }

  duplicateReq(reqId: string) {
    this.store.select(RequestsStateSelector.getRequestByIdDynamic(reqId)).pipe(take(1))
      .subscribe((req: ApiRequest) => {

        this.store.select(RequestsStateSelector.getFolderById)
          .pipe(map(filterFn => filterFn(req._parent)))
          .pipe(take(1))
          .subscribe((parent: ReqFolder) => {
            let reqToCopy: ApiRequest = { ...req };
            this.dialog.open(SaveReqDialogComponent, { data: { req: reqToCopy, action: 'duplicate', parent: parent.name }, width: '600px' });
          })
      });
  }

  editReq(reqId: string) {
    this.store.select(RequestsStateSelector.getRequestByIdDynamic(reqId)).pipe(take(1))
      .subscribe((req: ApiRequest) => {

        this.store.select(RequestsStateSelector.getFolderById)
          .pipe(map(filterFn => filterFn(req._parent)))
          .pipe(take(1))
          .subscribe((parent: ReqFolder) => {
            let reqToCopy: ApiRequest = { ...req };
            this.dialog.open(SaveReqDialogComponent, { data: { req: reqToCopy, action: 'rename', parent: parent.name }, width: '600px' });
          })
      });
  }

  async initCopyMove() {
    this.toastr.info('You can move a request or a folder by dragging it into another folder. Hold Ctrl/Cmd for copy.', 6000);
  }


  downloadFolder(folderId: string) {
    this.store.select(RequestsStateSelector.getFoldersTreeById)
      .pipe(map(filterFn => filterFn(folderId)))
      .pipe(take(1))
      .subscribe(tree => {
        let exportData = {
          TYPE: 'Folder',
          value: tree
        }
        this.fileSystem.download(tree.name + '.folder.apic.json', JSON.stringify(exportData, null, '\t'));
      })
  }

  async downloadProjectFolder(folder, projId: string) {
    let project = await this.store.select(ApiProjectStateSelector.getByIdDynamic(projId)).pipe(first()).toPromise();
    let toExport = { ...folder };
    toExport.requests = folder.requests.map(r => {
      let endpoint = project.endpoints?.[r._id];
      return RequestUtils.endpointToApiRequest(endpoint, project);
    })

    if (folder.children?.length > 0) {
      toExport.children = folder.children.map(childFolder => {
        return {
          ...childFolder, requests: childFolder.requests.map(r => {
            let endpoint = project.endpoints?.[r._id];
            return RequestUtils.endpointToApiRequest(endpoint, project);
          })
        }
      })
    }
    let exportData = {
      TYPE: 'Folder',
      value: toExport
    }
    this.fileSystem.download(toExport.name + '.folder.apic.json', JSON.stringify(exportData, null, '\t'));
  }

  toggleExpand(id: string) {
    this.flags.expanded[id] = !this.flags.expanded[id];
  }

  openSavedRequest(req: ApiRequest) {
    if (req.type === 'ws') {
      this.testerTabService.addSocketTab(req._id, req.name)
    } else {
      this.testerTabService.addReqTab(req._id, req.name);
    }
  }

  async openProjectRequest(endpId: string, projectId: string) {
    let project = await this.store.select(ApiProjectStateSelector.getByIdDynamic(projectId)).pipe(first()).toPromise();
    let endpoint = project.endpoints?.[endpId];
    if (endpoint && project) {
      let request: ApiRequest = RequestUtils.endpointToApiRequest(endpoint, project);
      this.testerTabService.addEndpointReqTab(request, projectId)
    } else {
      this.toastr.error('Request doesn\'t exist.');
    }
  }

  async convertFolderToSuite(folder: LeftTreeFolder, reqIsFrom: ReqIsFrom, projectId?: string) {
    let testProjects = await this.suitesTree$.pipe(take(1)).toPromise();
    this.treeSelectorOpt = {
      show: true,
      items: testProjects,
      options: {
        title: 'Select test project',
        doneText: 'Add to selected project',
        treeOptions: { showChildren: false }
      },
      onDone: async (projId) => {
        var ts = Date.now();
        var suite: Suite = {
          _id: ts + '-' + apic.s12(),
          _created: ts,
          _modified: ts,
          name: folder.name,
          projId: projId,
          reqs: []
        };
        let apiProject: ApiProject;
        if (reqIsFrom == 'project') {
          apiProject = await this.store.select(ApiProjectStateSelector.getByIdDynamic(projectId)).pipe(first()).toPromise();
        }
        if (folder.requests) {
          suite.reqs = await Promise.all(folder.requests.map(async (r): Promise<SuiteReq> => {
            if (reqIsFrom == 'project') {
              let endpoint = apiProject.endpoints?.[r._id];
              return { ...RequestUtils.endpointToApiRequest(endpoint, apiProject), disabled: false }
            } else {
              let request = await this.store.select(RequestsStateSelector.getRequestByIdDynamic(r._id)).pipe(take(1)).toPromise();
              return { ...request, disabled: false }
            }
          }));
        }

        if (folder.children?.length > 0) {
          for (var f = 0; f < folder.children.length; f++) {
            var cf = folder.children[f];
            for (var i = 0; i < cf.requests?.length; i++) {
              if (reqIsFrom == 'project') {
                let endpoint = apiProject.endpoints?.[cf.requests[i]._id];
                suite.reqs.push({ ...RequestUtils.endpointToApiRequest(endpoint, apiProject), disabled: false });
              } else {
                let request = await this.store.select(RequestsStateSelector.getRequestByIdDynamic(cf.requests[i]._id)).pipe(take(1)).toPromise();
                suite.reqs.push({ ...request, disabled: false });
              }
            }
          }
        }
        try {
          await this.suiteService.createTestSuite(suite, true);
          this.toastr.success(`Test suite ${suite.name} created.`);
        } catch (e) {
          console.error('Failed to convert folder to suite.', e);
          this.toastr.error(`Failed to convert folder to suite.${e?.message || e || ''}`);
        }
        this.treeSelectorOpt.show = false;
      }
    }
  }

  async addRequestToSuite(partialReq: ApiRequest, reqIsFrom: ReqIsFrom, projectId?: string) {
    if (partialReq.type === 'ws') {
      this.toastr.error('Websocket requests can not be added to suites.');
      return;
    }
    let testProjects = await this.suitesTree$.pipe(take(1)).toPromise();
    this.treeSelectorOpt = {
      show: true,
      items: testProjects,
      options: {
        title: 'Select test suite',
        doneText: 'add to selected suite',
        treeOptions: {
          disableParent: true,
          showChildren: true,
          childrenKey: 'suites'
        }
      },
      onDone: (suiteId) => {
        this.store.select(SuitesStateSelector.getSuiteByIdDynamic(suiteId))
          .pipe(take(1))
          .subscribe(async (suite) => {
            let request: ApiRequest;
            if (reqIsFrom == 'project') {
              let apiProject = await this.store.select(ApiProjectStateSelector.getByIdDynamic(projectId)).pipe(first()).toPromise();
              let endpoint = apiProject.endpoints?.[partialReq._id];
              request = RequestUtils.endpointToApiRequest(endpoint, apiProject);
            } else {
              request = await this.store.select(RequestsStateSelector.getRequestByIdDynamic(partialReq._id)).pipe(take(1)).toPromise();
            }
            if (!request) {
              this.toastr.error('Request not found.'); return;
            }
            let suiteToUpdate = { ...suite, reqs: [...suite.reqs, { ...request, disabled: false }] };
            try {
              await this.suiteService.updateSuite(suiteToUpdate);
              this.toastr.success(`Request added to suite ${suite.name}.`);
            } catch (e) {
              console.error('Failed add request to suite.', e);
              this.toastr.error(`Failed add request to suite.${e?.message || e || ''}`);
            }
            this.treeSelectorOpt.show = false;
          })
      }
    }
  }

  showSearch() {
    this.flags.showSearch = true;
    this.flags.expandAll = true;
    document.getElementById('req-search')?.focus();
  }

  shareFolder(folder: ReqFolder) {
    if (!!folder.parentId) {
      this.toastr.error('You can\'t share a subfolder. Please share it\'s parent');
      return;
    }
    if (!this.authService.isLoggedIn()) {
      this.toastr.error('You need to login to apic to use this feature.');
      return;
    }
    this.dialog.open(SharingComponent, { data: { objId: folder._id, type: 'Folders' } });
  }

  unshareFolder(folder: ReqFolder) {
    if (!!folder.parentId) {
      this.toastr.error('You can\'t unshare a subfolder. Please unshare it\'s parent');
      return;
    }
    this.flags.unsharingId = folder._id;
    this.sharing.unshare(folder._id, folder.team, 'Folders').pipe(first())
      .subscribe(teams => {
        this.flags.unsharingId = '';
        this.toastr.success(`Project un-shared with team.`);
      }, () => {
        this.flags.unsharingId = '';
      })
  }

  handleDragstart($event: DragEvent, node: LeftTreeRequest | LeftTreeFolder) {
    $event.stopPropagation();
    ($event.target as HTMLElement).classList.add('drag-target');
    $event.dataTransfer.setData('id', node._id);
    if ('treeItem' in node) {
      $event.dataTransfer.setData('type', node.treeItem);
      $event.dataTransfer.setData('isRoot', (!node.parentId).toString())
    } else {
      $event.dataTransfer.setData('type', 'Request');
    }
  }

  handleDragenter($event: DragEvent, node: LeftTreeFolder) {
    setTimeout(() => {
      this.flags.expanded[node._id] = true;
      $event.preventDefault();
      $event.stopPropagation();

      let target: HTMLElement = $event.target as HTMLElement;
      let parent = target.closest('div.folder-wrap') as HTMLElement;
      parent.classList.add('drop-target');
    }, 0);
  }

  handleDragleave($event: DragEvent) {
    $event.stopPropagation();

    let target: HTMLElement = $event.target as HTMLElement;
    let parent = target.closest('div.folder-wrap') as HTMLElement;
    parent.classList.remove('drop-target');
  }

  handleDragover($event: DragEvent, node) {
    $event.preventDefault();
  }

  handleDragend($event: DragEvent) {
    document.querySelector('.drop-target')?.classList.remove('drop-target');
    document.querySelector('.drag-target')?.classList.remove('drag-target');
  }

  async handleDrop($event: DragEvent, targetFolder: LeftTreeFolder) {
    $event.stopPropagation();
    let moveId: string = $event.dataTransfer.getData('id'),
      moveType = $event.dataTransfer.getData('type') as 'Request' | 'Folder',
      isCopy = $event.ctrlKey || $event.metaKey;

    if (moveType === 'Request') {
      let reqBeingMoved = await this.store.select(RequestsStateSelector.getRequestByIdDynamic(moveId))
        .pipe(take(1)).toPromise();
      if (reqBeingMoved._parent != targetFolder._id) {
        let reqs = await this.store.select(RequestsStateSelector.getRequestsInFolder)
          .pipe(map(filterFn => filterFn(targetFolder._id))).pipe(take(1)).toPromise()
        let newReqName = await this.#copyMoveRequest(reqBeingMoved, reqs, targetFolder._id, isCopy);
        if (newReqName !== reqBeingMoved.name) {
          this.toastr.success(`Destination has a request with same name. Request renamed to ${newReqName}`, 5000)
        } else {
          this.toastr.success(isCopy ? 'Copied.' : 'Moved.');
        }
      }
    } else {
      let isSrcARootFolder: boolean = $event.dataTransfer.getData('isRoot') == 'true',
        isTargetARootFolder = !targetFolder.parentId

      if (moveId !== targetFolder._id) {
        let srcFolder = await this.store.select(RequestsStateSelector.getFolderById)
          .pipe(map(filterFn => filterFn(moveId))).pipe(take(1)).toPromise();


        if (isSrcARootFolder && isTargetARootFolder) {//root to root - merge 
          let srcFolderTree = await this.store.select(RequestsStateSelector.getFoldersTreeById)
            .pipe(map(filterFn => filterFn(moveId))).pipe(take(1)).toPromise();

          srcFolderTree.requests.forEach(async req => {
            let reqToMove: ApiRequest = await this.store.select(RequestsStateSelector.getRequestByIdDynamic(req._id))
              .pipe(take(1)).toPromise();
            await this.#copyMoveRequest(reqToMove, targetFolder.requests, targetFolder._id, isCopy);
          });

          //move sub folders
          srcFolderTree.children.forEach(async subfolder => {
            let srcSubFolder = await this.store.select(RequestsStateSelector.getFolderById)
              .pipe(map(filterFn => filterFn(subfolder._id))).pipe(take(1)).toPromise();
            await this.#copyMoveFolder(srcSubFolder, targetFolder, isCopy);
          })

        } else if (isSrcARootFolder && !isTargetARootFolder) {//root to subfolder - not allowed 
          this.toastr.error('You are trying to move a root folder into a subfolder which is not supported as of now as we currently support only 1 level of nested folders.', 7000);
        } else if (!isSrcARootFolder && isTargetARootFolder) {//subfolder to root - add
          if (srcFolder.parentId != targetFolder._id) {
            let fname = await this.#copyMoveFolder(srcFolder, targetFolder, isCopy);
            if (fname !== srcFolder.name) {
              this.toastr.success(`Folder renamed to ${fname} as destination already has a folder with the same name`, 5000);
            } else {
              this.toastr.success(isCopy ? 'Copied.' : 'Moved.');
            }
          }
        } else if (!isSrcARootFolder && !isTargetARootFolder) {//subfolder to subfolder merge 
          let srcParentFolderTree = await this.store.select(RequestsStateSelector.getFoldersTreeById)
            .pipe(map(filterFn => filterFn(srcFolder.parentId)))
            .pipe(take(1)).toPromise();

          srcParentFolderTree.children.find(c => c._id === moveId)
            .requests.forEach(async req => {
              let reqToMove: ApiRequest = await this.store.select(RequestsStateSelector.getRequestByIdDynamic(req._id))
                .pipe(take(1)).toPromise();
              await this.#copyMoveRequest(reqToMove, targetFolder.requests, targetFolder._id, isCopy);
            });
        }
      }
    }
  }


  async #copyMoveRequest(reqBeingMoved: ApiRequest, existingReqs: ApiRequest[], targetFolderId: string, isCopy: boolean): Promise<string> {
    let reqName = this.#getDuplicateName(reqBeingMoved.name, existingReqs);
    let newReq: ApiRequest = { ...(reqBeingMoved as ApiRequest), name: reqName, _parent: targetFolderId };
    if (isCopy) {
      await this.reqService.createRequest(newReq)
    } else {
      await this.reqService.updateRequest(newReq)
    }
    return reqName;

  }

  async #copyMoveFolder(folderBeingMoved: ReqFolder, targetFolder: LeftTreeFolder, isCopy: boolean): Promise<string> {
    let fname = this.#getDuplicateName(folderBeingMoved.name, targetFolder.children);
    let newFolder: ReqFolder = { ...folderBeingMoved, name: fname, parentId: targetFolder._id };
    if (isCopy) {
      await this.reqService.createFolder(newFolder)
    } else {
      await this.reqService.updateFolder(newFolder)
    }
    return fname;
  }


  #getDuplicateName(originalName: string, existingItems: ApiRequest[] | ReqFolder[] | LeftTreeFolder[]) {
    let duplicate = false, name = originalName, counter = 0;
    do {
      counter++;
      duplicate = existingItems.some(r => r.name.toLocaleLowerCase() == name.toLocaleLowerCase());
      if (duplicate) {
        name = originalName + ' ' + counter;
      }
    } while (duplicate);
    return name
  }
}


