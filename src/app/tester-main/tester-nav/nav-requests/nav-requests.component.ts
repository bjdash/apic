import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Select, Store } from '@ngxs/store';
import { Observable, Subject } from 'rxjs';
import { map, take, takeUntil } from 'rxjs/operators';
import { ReqFolder } from 'src/app/models/ReqFolder.model';
import { User } from 'src/app/models/User.model';
import { RequestsService } from 'src/app/services/requests.service';
import { Toaster } from 'src/app/services/toaster.service';
import { RequestsStateSelector } from 'src/app/state/requests.selector';
import { RequestsState } from 'src/app/state/requests.state';
import { UserState } from 'src/app/state/user.state';

@Component({
  selector: 'app-nav-requests',
  templateUrl: './nav-requests.component.html',
  styleUrls: ['./nav-requests.component.css']
})
export class NavRequestsComponent implements OnInit, OnDestroy {
  @Select(RequestsStateSelector.getFoldersTree) folders$: Observable<any[]>;

  authUser: User;
  private destroy: Subject<boolean> = new Subject<boolean>();
  newFolderForm: FormGroup;
  rename = {
    _id: '',
    name: ''
  }

  flags = {
    projReqs: true,
    savedReqs: true,
    newFolder: false,
    expanded: {}
  }
  constructor(fb: FormBuilder, private store: Store, private reqService: RequestsService, private toastr: Toaster) {
    this.newFolderForm = fb.group({
      name: ['', Validators.required],
      desc: [''],
      parentId: ['', Validators.required]
    });

    this.store.select(UserState.getAuthUser).pipe(takeUntil(this.destroy)).subscribe(user => {
      this.authUser = user;
    });
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

  deleteFolder() {
    alert()
  }

  toggleExpand(id: string) {
    this.flags.expanded[id] = !this.flags.expanded[id];
  }
}
