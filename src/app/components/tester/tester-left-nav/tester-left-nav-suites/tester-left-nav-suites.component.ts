import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { Select, Store } from '@ngxs/store';
import { Observable, Subject } from 'rxjs';
import { first, map, take, takeUntil } from 'rxjs/operators';
import { LeftMenuTreeSelectorOptn } from 'src/app/components/common/left-menu-tree-selector/left-menu-tree-selector.component';
import { SharingComponent } from 'src/app/components/sharing/sharing.component';
import { Suite, SuiteReq } from 'src/app/models/Suite.model';
import { Team } from 'src/app/models/Team.model';
import { TestProject, TreeTestProject } from 'src/app/models/TestProject.model';
import { User } from 'src/app/models/User.model';
import { AuthService } from 'src/app/services/auth.service';
import { FileSystem } from 'src/app/services/fileSystem.service';
import { SharingService } from 'src/app/services/sharing.service';
import { SuiteService } from 'src/app/services/suite.service';
import { Toaster } from 'src/app/services/toaster.service';
import { Utils } from 'src/app/services/utils.service';
import { EnvState } from 'src/app/state/envs.state';
import { RequestsStateSelector } from 'src/app/state/requests.selector';
import { SuitesStateSelector } from 'src/app/state/suites.selector';
import { UserState } from 'src/app/state/user.state';
import { TesterTabsService } from '../../tester-tabs/tester-tabs.service';

@Component({
  selector: 'app-tester-left-nav-suites',
  templateUrl: './tester-left-nav-suites.component.html',
  styleUrls: ['./tester-left-nav-suites.component.scss']
})
export class TesterLeftNavSuitesComponent implements OnInit, OnDestroy {
  @Select(SuitesStateSelector.getSuitesTree) testProjects$: Observable<any[]>;
  newProjForm: FormGroup;
  suiteForm: FormGroup;
  authUser: User;
  private destroy: Subject<boolean> = new Subject<boolean>();
  teams: { [key: string]: Team } = {};

  rename = {
    _id: '',
    name: ''
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
    newProj: false,
    newSuite: false,
    unsharingId: '',//ID of the unsharing project
    expanded: {
      "123456abcdef-testproj-demo": true,//keep demo project expanded by default
      "123456abcdef-testsuite-demo": true
    }
  }
  constructor(private fb: FormBuilder,
    private toastr: Toaster,
    private suiteService: SuiteService,
    private fileSystem: FileSystem,
    private testerTabsService: TesterTabsService,
    private authService: AuthService,
    private toaster: Toaster,
    private dialog: MatDialog,
    private sharing: SharingService,
    private store: Store) {
    this.store.select(UserState.getAuthUser).pipe(takeUntil(this.destroy)).subscribe(user => {
      this.authUser = user;
    });
    this.sharing.teams$
      .subscribe(teams => {
        this.teams = Utils.arrayToObj(teams, 'id');
      })

    this.newProjForm = fb.group({
      name: ['']
    });
    this.suiteForm = fb.group({
      name: [''],
      projId: ['']
    });
  }

  ngOnInit(): void {
    this.suiteService.initAddReq$.pipe(takeUntil(this.destroy)).subscribe(([suite, index]: [Suite, number]) => {
      this.addReqToSuite(suite, index);
    })
  }
  ngOnDestroy(): void {
    this.destroy.next();
    this.destroy.complete();
  }

  async createProject() {
    var projName = this.newProjForm.value.name;
    if (!projName) {
      this.toastr.error('Please Specify a project name.');
      return;
    }
    let newProj: TestProject = { name: projName, _id: null };

    try {
      await this.suiteService.createTestProject(newProj)
      this.toastr.success('Project "' + newProj.name + '" created');
      this.newProjForm.reset();
    } catch (e) {
      console.error('Failed to createfolder', e, newProj)
      this.toastr.error(`Failed to create project: ${e?.message || e || ''}`);
      document.getElementById('newProjName').focus();
    }
  }

  async createSuite() {
    let { projId, name } = this.suiteForm.value;
    if (!name) {
      this.toastr.error('Please enter a suite name');
      return;
    }

    let newSuite: Suite = { _id: null, name, projId, reqs: [] }
    try {
      await this.suiteService.createTestSuite(newSuite)
      this.toastr.success('Suite "' + newSuite.name + '" created');
      this.flags.newSuite = false;
      this.suiteForm.reset();
    } catch (e) {
      console.error('Failed to createfolder', e, newSuite)
      this.toastr.error(`Failed to create suite: ${e.message}`);
      document.getElementById('newProjName').focus();
    }
  }

  async importSuite(projId: string) {
    const file: any = await this.fileSystem.readFile();
    var data = null;
    try {
      data = JSON.parse(file.data);
    } catch (e) {
      this.toastr.error('Import failed. Invalid file format');
    }
    if (!data)
      return;
    if (data.TYPE === 'APICSuite' && data.value) {
      if (await this.suiteService.validateSuiteImportData(data)) {
        let suite: Suite = data.value;
        suite.projId = projId;
        try {
          await this.suiteService.createTestSuite(suite, true);
          this.toastr.success('Import Complete.');
        } catch (e) {
          this.toastr.error(`Failed to import. ${e?.message || e || ''}`);
        }
      } else {
        this.toastr.error('Selected file doesn\'t contain valid test suite information');
      }
    } else {
      this.toastr.error('Selected file doesn\'t contain valid test suite information');
    }
  }

  async importProject() {
    const file: any = await this.fileSystem.readFile();
    var data = null;
    try {
      data = JSON.parse(file.data);
    } catch (e) {
      this.toastr.error('Import failed. Invalid file format');
    }
    if (!data)
      return;

    if (data.TYPE === 'APICTestProject' && data.value) {
      //older apic exported suites as an object, convert it to a list
      if (data.value.suits && !(data.value.suits instanceof Array)) {
        data.value.suites = Utils.objectValues(data.value.suits);
        delete data.value.suits;
      }
      if (await this.suiteService.validateProjectImportData(data)) {
        let project: TestProject = { _id: null, name: data.value.name }
        try {
          let newProj = await this.suiteService.createTestProject(project, true);
          let suites: Suite[] = data.value.suites.map((s: Suite): Suite => {
            return { name: s.name, projId: newProj._id, reqs: s.reqs, _id: null };
          });
          for (let suite of suites) {
            await this.suiteService.createTestSuite(suite, true);
          }
          this.toastr.success('Import Complete.');
        } catch (e) {
          this.toastr.error(`Failed to import. ${e?.message || e || ''}`);
        }
      } else {
        this.toastr.error('Selected file doesn\'t contain valid test project information');
      }
    } else {
      this.toastr.error('Selected file doesn\'t contain valid test project information');
    }
  }

  exportProject(project: TreeTestProject) {
    let exportData = {
      TYPE: 'APICTestProject',
      value: project
    }
    this.fileSystem.download(project.name + '.testProject.apic.json', JSON.stringify(exportData, null, '\t'));
  }

  showProjForm() {
    this.flags.newProj = true;
    setTimeout(() => {
      document.getElementById('newProjName').focus();
    }, 0);
  }

  showNewSuitForm(projId: string) {
    this.flags.newSuite = true;
    this.flags.expanded[projId] = true;
    this.suiteForm.patchValue({ projId })
    setTimeout(() => {
      document.getElementById('newSuiteName').focus();
    }, 0);
  }

  showRename(project: TestProject) {
    const { _id, name } = project;
    this.rename = { _id, name };
    setTimeout(() => {
      document.getElementById('proj_' + project._id).focus();
    }, 0);
  }

  saveProjectRename() {
    let { _id, name } = this.rename;
    this.store.select(SuitesStateSelector.getProjects)
      .pipe(take(1))
      .subscribe(async (projs) => {
        if (projs.find(p => p._id != _id && p.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
          this.toastr.error(`A project with the same name already exists.`);
          document.getElementById('proj_' + _id).focus();
        } else {
          let projToEdit = projs.find(p => p._id == _id);
          if (projToEdit) {
            projToEdit = { ...projToEdit, name };
            try {
              await this.suiteService.updateTestProject(projToEdit);
              this.toastr.success('Project renamed.');
              this.rename._id = ''
            } catch (e) {
              this.toastr.error(`Failed to rename folder: ${e.message}`);
              document.getElementById('proj_' + this.rename._id).focus();
            }
          } else {
            this.toastr.error(`Project not found.`);
          }
        }
      })
  }

  shareProject(project: TestProject) {
    if (!this.authService.isLoggedIn()) {
      this.toaster.error('You need to login to apic to use this feature.');
      return;
    }
    this.dialog.open(SharingComponent, { data: { objId: project._id, type: 'TestCaseProjects' } });
  }
  unshareProject(project: TestProject) {
    this.flags.unsharingId = project._id;
    this.sharing.unshare(project._id, project.team, 'TestCaseProjects').pipe(first())
      .subscribe(teams => {
        this.flags.unsharingId = '';
        this.toaster.success(`Project un-shared with team.`);
      }, () => {
        this.flags.unsharingId = '';
      })
  }

  async deleteProject(project: TreeTestProject) {
    try {
      for (let suite of project.suites) {
        await this.suiteService.deleteSuite(suite._id, suite.owner);
      }
      await this.suiteService.deleteTestproject(project._id, project.owner);
      this.toastr.success('Project deleted.');
    } catch (e) {
      this.toastr.error(`Failed to delete project ${e.message || e || ''}`);
      console.error('Failed to delete project', e);
    }
  }

  async deleteSuite(suiteId: string, owner: string) {
    try {
      await this.suiteService.deleteSuite(suiteId, owner);
      this.toastr.success('Suite deleted.');
    } catch (e) {
      console.error('Failed to delete suite.', e);
      this.toastr.error(`Failed to delete suite ${e.message}`);
    }
  }

  openSuite(suite: Suite, reqToOpen?: string) {
    this.testerTabsService.addSuiteTab(suite._id, suite.name, reqToOpen)
  }


  async removeReqFromSuit(suite: Suite, reqId: string, index: number) {
    try {
      await this.suiteService.removeReqFromSuit(suite, reqId, index);
      this.toastr.success('Request removed.');
    } catch (e) {
      console.error('Failed to remove request', e, suite)
      this.toastr.error(`Failed to remove request: ${e.message}`);
    }
  }

  async exportSuite(suite: Suite, includeEnv = false) {
    var suiteToExport = { ...suite };
    delete suiteToExport.owner;
    delete suiteToExport.team;
    var data = {
      TYPE: 'APICSuite',
      value: suiteToExport
    };
    if (data.value)
      this.fileSystem.download(suite.name + '.suit.apic.json', JSON.stringify(data));

    //export the selected env
    if (includeEnv && suiteToExport.env) {
      let envToExport = await this.store.select(EnvState.getById)
        .pipe(map(filterFn => filterFn(suiteToExport.env)))
        .pipe(take(1)).toPromise();
      if (envToExport) {
        this.fileSystem.downloadEnv(envToExport);
      }
    } else if (includeEnv) {
      this.toastr.warn('Selected to export with environment but current suite doesn\'t use any environment');
    }
  }

  async duplicateReqInSuit(suite: Suite, req: SuiteReq, index: number) {
    try {
      await this.suiteService.duplicateReqInSuit(suite, req, index);
      this.toastr.success('Duplicate request created.');
    } catch (e) {
      console.error('Failed to duplicate request', e, suite)
      this.toastr.error(`Failed to duplicate request: ${e.message}`);
    }
  }

  toggleExpand(id: string) {
    this.flags.expanded[id] = !this.flags.expanded[id];
  }

  async addReqToSuite(suite: Suite, index?: number) {
    this.flags.expanded[suite._id] = true;
    let reqs = await this.store.select(RequestsStateSelector.getRequests).pipe(take(1)).toPromise();
    this.treeSelectorOpt = {
      show: true,
      items: reqs,
      options: {
        title: 'Select request',
        doneText: 'add selected request',
        treeOptions: {
          disableParent: false,
          showChildren: false
        }
      },
      onDone: (reqId) => {
        this.store.select(RequestsStateSelector.getRequestByIdDynamic(reqId))
          .pipe(take(1))
          .subscribe(async (request) => {
            if (request.type === 'ws') {
              this.toastr.error('Websocket requests can not be added to suites.');
              return;
            }
            let suiteToUpdate = { ...suite, reqs: [...suite.reqs] };
            if (index === undefined) {
              suiteToUpdate.reqs.push({ ...request, disabled: false })
            } else {
              suiteToUpdate.reqs.splice(index, 0, { ...request, disabled: false })
            }
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

  shareSuite() {
    this.toastr.warn('Sharing of individual suite is not possible. Please share the entire test project.')
  }
}
