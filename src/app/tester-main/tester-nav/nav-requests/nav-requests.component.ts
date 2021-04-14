import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { Select, Store } from '@ngxs/store';
import { Observable, Subject } from 'rxjs';
import { map, take, takeUntil } from 'rxjs/operators';
import { ReqFolder } from 'src/app/models/ReqFolder.model';
import { ApiRequest } from 'src/app/models/Request.model';
import { User } from 'src/app/models/User.model';
import { FileSystem } from 'src/app/services/fileSystem.service';
import { RequestsService } from 'src/app/services/requests.service';
import { Toaster } from 'src/app/services/toaster.service';
import { RequestsStateSelector } from 'src/app/state/requests.selector';
import { RequestsState } from 'src/app/state/requests.state';
import { UserState } from 'src/app/state/user.state';
import apic from 'src/app/utils/apic';
import { SaveReqDialogComponent } from '../../save-req-dialog/save-req-dialog.component';
import { TesterTabsService } from '../../tester-tabs/tester-tabs.service';

@Component({
  selector: 'app-nav-requests',
  templateUrl: './nav-requests.component.html',
  styleUrls: ['./nav-requests.component.scss']
})
export class NavRequestsComponent implements OnInit, OnDestroy {
  @Select(RequestsStateSelector.getFoldersTree) folders$: Observable<any[]>;

  authUser: User;
  private destroy: Subject<boolean> = new Subject<boolean>();
  selectedTabId: string;
  newFolderForm: FormGroup;
  rename = {
    _id: '',
    name: ''
  }

  copyMove = {
    showTree: false,
    type: '',
    reqId: '',
    reqName: '',
    parent: new FormControl('')
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
    if (this.authUser?.UID) {
      newFolder.owner = this.authUser.UID;
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
        this.toastr.error('Selected file doesn\'t contain valid environment information');
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
        importFolderData.folders = [importFolderData.folders, ...childImport.folders]
        importFolderData.reqs = [importFolderData.reqs, ...childImport.reqs]
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
            Body: req.Body
          };
        }

        importFolderData.reqs.push(reqToAdd);
      }
    }

    return importFolderData;
  }

  deleteFolder() {
    alert()
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
            this.dialog.open(SaveReqDialogComponent, { data: { req: reqToCopy, duplicate: true, parent: parent.name }, width: '600px' });
          })
      });
  }

  initCopyMove(type: 'copy' | 'move', reqId: string, reqName: string) {
    this.copyMove = {
      ...this.copyMove,
      type,
      reqId,
      reqName,
      showTree: true
    }
    this.copyMove.parent.setValue('');
  }

  doCopyMove() {
    let parent = this.copyMove.parent.value;
    if (!parent) {
      this.toastr.error('Please select the destination folder.');
      return;
    }
    this.store.select(RequestsStateSelector.getRequestByIdDynamic(this.copyMove.reqId))
      .pipe(take(1))
      .subscribe(originalReq => {
        if (originalReq) {
          this.store.select(RequestsStateSelector.getRequestsInFolder)
            .pipe(map(filterFn => filterFn(parent)))
            .pipe(take(1))
            .subscribe(async (reqs) => {
              let duplicate = false, reqName = this.copyMove.reqName, counter = 0;
              do {
                counter++;
                duplicate = reqs.some(r => r.name.toLocaleLowerCase() == reqName.toLocaleLowerCase())
                if (duplicate) {
                  reqName = this.copyMove.reqName + ' ' + counter;
                }
              } while (duplicate);

              let newReq = { ...originalReq, name: reqName, _parent: parent };
              if (this.copyMove.type == 'copy') {
                await this.reqService.createRequests([newReq])
              } else {
                await this.reqService.updateRequests([newReq])
              }
              this.toastr.success('Done');
              this.copyMove.showTree = false;
            });
        }
      })


  }

  toggleExpand(id: string) {
    this.flags.expanded[id] = !this.flags.expanded[id];
  }

  loadFromSave(req: ApiRequest) {
    this.testerTabService.addReqTab(req._id, req.name);
  }
}
