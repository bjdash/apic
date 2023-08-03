import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { Select, Store } from '@ngxs/store';
import { Observable, Subject } from 'rxjs';
import { first, map, take, takeUntil } from 'rxjs/operators';
import { LeftMenuTreeSelectorOptn } from 'src/app/components/common/left-menu-tree-selector/left-menu-tree-selector.component';
import { SharingComponent } from 'src/app/components/sharing/sharing.component';
import { ApiProject } from 'src/app/models/ApiProject.model';
import { ReqFolder, TreeReqFolder } from 'src/app/models/ReqFolder.model';
import { ApiRequest } from 'src/app/models/Request.model';
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

  async deleteFolder(folder: TreeReqFolder) {
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

  async initCopyMove(type: 'copy' | 'move', reqId: string, reqName: string) {
    this.copyMoveOption = {
      ...this.copyMoveOption,
      type,
      reqId,
      reqName
    }
    let folders = await this.folders$.pipe(take(1)).toPromise()
    this.treeSelectorOpt = {
      show: true,
      items: folders,
      options: {
        title: 'Select Folder',
        doneText: type,
        treeOptions: { showChildren: true }
      },
      onDone: this.doCopyMove.bind(this)
    }
  }

  doCopyMove(parent) {
    if (!parent) {
      this.toastr.error('Please select the destination folder.');
      return;
    }
    this.store.select(RequestsStateSelector.getRequestByIdDynamic(this.copyMoveOption.reqId))
      .pipe(take(1))
      .subscribe(originalReq => {
        if (originalReq) {
          this.store.select(RequestsStateSelector.getRequestsInFolder)
            .pipe(map(filterFn => filterFn(parent)))
            .pipe(take(1))
            .subscribe(async (reqs) => {
              let duplicate = false, reqName = this.copyMoveOption.reqName, counter = 0;
              do {
                counter++;
                duplicate = reqs.some(r => r.name.toLocaleLowerCase() == reqName.toLocaleLowerCase())
                if (duplicate) {
                  reqName = this.copyMoveOption.reqName + ' ' + counter;
                }
              } while (duplicate);

              let newReq = { ...originalReq, name: reqName, _parent: parent };
              if (this.copyMoveOption.type == 'copy') {
                await this.reqService.createRequest(newReq)
              } else {
                await this.reqService.updateRequest(newReq)
              }
              this.toastr.success('Done');
              this.treeSelectorOpt.show = false;
            });
        }
      })
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
      console.log(project, endpoint);
      let request: ApiRequest = RequestUtils.endpointToApiRequest(endpoint, project);
      this.testerTabService.addEndpointReqTab(request, projectId)
    } else {
      this.toastr.error('Request doesn\'t exist.');
    }
  }

  async convertFolderToSuite(folder: TreeReqFolder, reqIsFrom: ReqIsFrom, projectId?: string) {
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
}
