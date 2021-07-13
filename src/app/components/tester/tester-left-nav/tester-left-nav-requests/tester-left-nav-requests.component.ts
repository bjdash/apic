import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { Select, Store } from '@ngxs/store';
import { Observable, Subject } from 'rxjs';
import { first, map, take, takeUntil } from 'rxjs/operators';
import { LeftMenuTreeSelectorOptn } from 'src/app/components/common/left-menu-tree-selector/left-menu-tree-selector.component';
import { ReqFolder, TreeReqFolder } from 'src/app/models/ReqFolder.model';
import { ApiRequest } from 'src/app/models/Request.model';
import { Suite } from 'src/app/models/Suite.model';
import { User } from 'src/app/models/User.model';
import { FileSystem } from 'src/app/services/fileSystem.service';
import { RequestsService } from 'src/app/services/requests.service';
import { SuiteService } from 'src/app/services/suite.service';
import { Toaster } from 'src/app/services/toaster.service';
import { ApiProjectStateSelector } from 'src/app/state/apiProjects.selector';
import { RequestsStateSelector } from 'src/app/state/requests.selector';
import { SuitesStateSelector } from 'src/app/state/suites.selector';
import { UserState } from 'src/app/state/user.state';
import apic from 'src/app/utils/apic';
import { RequestUtils } from 'src/app/utils/request.util';
import { SaveReqDialogComponent } from '../../save-req-dialog/save-req-dialog.component';
import { TesterTab, TesterTabsService } from '../../tester-tabs/tester-tabs.service';

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
    expanded: {}
  }
  constructor(fb: FormBuilder,
    private store: Store,
    private reqService: RequestsService,
    private fileSystem: FileSystem,
    private testerTabService: TesterTabsService,
    private dialog: MatDialog,
    private suiteService: SuiteService,
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
  createFolder() {
    var newFolder = this.newFolderForm.value;
    if (newFolder.parentId === undefined) {
      this.toastr.error('Please select a parent folder.');
      return;
    }
    if (newFolder.parentId === 'root' || !newFolder.parentId) {
      newFolder.parentId = null;
    }

    this.folders$.pipe(take(1)).subscribe(async (folders: any[]) => {
      let siblings = newFolder.parentId ?
        folders.find(f => f._id === newFolder.parentId).children : folders;

      if (siblings.find(s => s.name === newFolder.name)) {
        this.toastr.error('Folder already exists');
        document.getElementById('newFolderName').focus();
      } else {
        try {
          await this.reqService.createFolders([newFolder])
          this.toastr.success('Folder "' + newFolder.name + '" created');
          this.newFolderForm.reset();
        } catch (e) {
          console.error('Failed to createfolder', e, newFolder)
          this.toastr.error(`Failed to create folder: ${e.message}`);
          document.getElementById('newFolderName').focus();

        }

      }
    });
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
            //TODO:Check duplicate
            await this.reqService.updateFolders([toSave]);
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
      if (this.reqService.validateImportData(data) === true) {
        let importFolderData = this.processImportedFolder(data.value, true);
        try {
          await this.reqService.createFolders(importFolderData.folders);
          await this.reqService.createRequests(importFolderData.reqs);
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

  private processImportedFolder(folder, isParent: boolean) {
    var time = new Date().getTime();
    let importFolderData = {
      folders: [],
      reqs: []
    };
    var folderToAdd = {
      _id: time + '-' + apic.s12(),
      name: folder.name,
      desc: folder.desc,
      parentId: isParent ? null : folder.parentId
    };
    importFolderData.folders.push(folderToAdd);

    if (folder.children && folder.children.length > 0) {
      for (var i = 0; i < folder.children.length; i++) {
        folder.children[i].parentId = folderToAdd._id;
        let childImport = this.processImportedFolder(folder.children[i], false);
        importFolderData.folders = [...importFolderData.folders, ...childImport.folders]
        importFolderData.reqs = [...importFolderData.reqs, ...childImport.reqs]
      }
    }
    if (folder.requests && folder.requests.length > 0) {
      for (var i = 0; i < folder.requests.length; i++) {
        var req = folder.requests[i];
        var reqToAdd;
        if (['Stomp', 'Websocket'].indexOf(req.method) >= 0) {
          reqToAdd = {
            url: req.url,
            method: req.method,
            name: req.name,
            description: req.description,
            _parent: folderToAdd._id,
            type: req.type,
            connection: req.connection,
            destQ: req.destQ

          };
        } else {
          reqToAdd = {
            url: req.url,
            method: req.method,
            prescript: req.prescript,
            postscript: req.postscript,
            name: req.name,
            description: req.description,
            _parent: folderToAdd._id,
            Req: req.Req,
            Body: req.Body,
            respCodes: req.respCodes,
            savedResp: req.savedResp
          };
        }

        importFolderData.reqs.push(reqToAdd);
      }
    }

    return importFolderData;
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
      await this.reqService.deleteRequests(reqsToDelete);
      await this.reqService.deleteFolders(foldersToDelete);
      this.toastr.success('Folder deleted');
    } catch (e) {
      console.error('Failed to delete folder', e);
      this.toastr.error(`Failed to delete folder ${e.message}`);
    }
  }

  async deleteRequest(id: string, name: string) {
    try {
      await this.reqService.deleteRequests([id]);
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
                await this.reqService.createRequests([newReq])
              } else {
                await this.reqService.updateRequests([newReq])
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

  async convertFolderToSuite(folder: TreeReqFolder) {
    let projects = await this.suitesTree$.pipe(take(1)).toPromise();
    this.treeSelectorOpt = {
      show: true,
      items: projects,
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

        if (folder.requests) {
          suite.reqs = folder.requests.map(r => { return { ...r, disabled: false } })
        }

        if (folder.children?.length > 0) {
          for (var f = 0; f < folder.children.length; f++) {
            var cf = folder.children[f];
            for (var i = 0; i < cf.requests?.length; i++) {
              suite.reqs.push({ ...cf.requests[i], disabled: false });
            }
          }
        }
        //TODO: Check for duplicate name
        try {
          await this.suiteService.createTestSuites([suite]);
          this.toastr.success(`Test suite ${suite.name} created.`);
        } catch (e) {
          console.error('Failed to convert folder to suite.', e);
          this.toastr.error(`Failed to convert folder to suite.`);
        }
        this.treeSelectorOpt.show = false;
      }
    }
  }

  async addRequestToSuite(partialReq: ApiRequest) {
    if (partialReq.type === 'ws') {
      this.toastr.error('Websocket requests can not be added to suites.');
      return;
    }
    let projects = await this.suitesTree$.pipe(take(1)).toPromise();
    this.treeSelectorOpt = {
      show: true,
      items: projects,
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
            let request = await this.store.select(RequestsStateSelector.getRequestByIdDynamic(partialReq._id)).pipe(take(1)).toPromise();
            let suiteToUpdate = { ...suite, reqs: [...suite.reqs, { ...request, disabled: false }] };
            try {
              await this.suiteService.updateSuites([suiteToUpdate]);
              this.toastr.success(`Request added to suite ${suite.name}.`);
            } catch (e) {
              console.error('Failed add request to suite.', e);
              this.toastr.error(`Failed add request to suite.`);
            }
            this.treeSelectorOpt.show = false;
          })
      }
    }
  }
}
