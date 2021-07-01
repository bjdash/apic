import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Select, Store } from '@ngxs/store';
import { Observable, Subject } from 'rxjs';
import { map, take, takeUntil } from 'rxjs/operators';
import { LeftMenuTreeSelectorOptn } from 'src/app/components/common/left-menu-tree-selector/left-menu-tree-selector.component';
import { Suite, SuiteReq } from 'src/app/models/Suite.model';
import { TestProject, TreeTestProject } from 'src/app/models/TestProject.model';
import { User } from 'src/app/models/User.model';
import { FileSystem } from 'src/app/services/fileSystem.service';
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
    private store: Store) {
    this.store.select(UserState.getAuthUser).pipe(takeUntil(this.destroy)).subscribe(user => {
      this.authUser = user;
    });

    this.newProjForm = fb.group({
      name: ['']
    });
    this.suiteForm = fb.group({
      name: [''],
      projId: ['']
    });
  }

  ngOnInit(): void {
    //TODO: remove
    this.testerTabsService.addSuiteTab("123456abcdef-testsuite-demo", "Demo");
    this.suiteService.initAddReq$.pipe(takeUntil(this.destroy)).subscribe(([suite, index]: [Suite, number]) => {
      this.addReqToSuite(suite, index);
    })
  }
  ngOnDestroy(): void {
    this.destroy.next();
    this.destroy.complete();
  }

  createProject() {
    var projName = this.newProjForm.value.name;
    if (!projName) {
      this.toastr.error('Please Specify a project name.');
      return;
    }
    let newProj: TestProject = { name: projName, _id: null };

    this.testProjects$.pipe(take(1)).subscribe(async (projects: any[]) => {
      if (projects.find(s => s.name?.toLowerCase() === newProj.name.toLowerCase())) {
        this.toastr.error('A test project with the same name already exists.');
        document.getElementById('newProjName').focus();
      } else {
        try {
          await this.suiteService.createTestProjects([newProj])
          this.toastr.success('Project "' + newProj.name + '" created');
          this.newProjForm.reset();
        } catch (e) {
          console.error('Failed to createfolder', e, newProj)
          this.toastr.error(`Failed to create project: ${e.message}`);
          document.getElementById('newProjName').focus();
        }
      }
    });
  }

  createSuite() {
    let { projId, name } = this.suiteForm.value;
    if (!name) {
      this.toastr.error('Please enter a suite name');
      return;
    }

    let newSuite: Suite = { _id: null, name, projId, reqs: [] }
    this.store.select(SuitesStateSelector.getSuites)
      .pipe(take(1))
      .subscribe(async (suites: Suite[]) => {
        if (suites.find(s => s.name.toLocaleLowerCase() == newSuite.name.toLocaleLowerCase() && s.projId === newSuite.projId)) {
          this.toastr.error('A test suite with the same name already exists in the project.');
          document.getElementById('newSuiteName').focus();
        } else {
          try {
            await this.suiteService.createTestSuites([newSuite])
            this.toastr.success('Suite "' + newSuite.name + '" created');
            this.flags.newSuite = false;
            this.suiteForm.reset();
          } catch (e) {
            console.error('Failed to createfolder', e, newSuite)
            this.toastr.error(`Failed to create suite: ${e.message}`);
            document.getElementById('newProjName').focus();
          }
        }
      })
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
      if (this.suiteService.validateSuiteImportData(data) === true) {
        let suite: Suite = data.value;
        suite.projId = projId;
        try {
          //TODO: Check for duplicate name
          await this.suiteService.createTestSuites([suite]);
          this.toastr.success('Import Complete.');
        } catch (e) {
          this.toastr.error(`Failed to import. ${e.message}`);
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
      if (this.suiteService.validateProjectImportData(data) === true) {
        let project: TestProject = { _id: null, name: data.value.name }
        try {
          //TODO: Check for duplicate name
          let newProj = (await this.suiteService.createTestProjects([project]))[0];
          let suites: Suite[] = data.value.suites.map((s: Suite): Suite => {
            return { name: s.name, projId: newProj._id, reqs: s.reqs, _id: null };
          });
          await this.suiteService.createTestSuites(suites);
          this.toastr.success('Import Complete.');
        } catch (e) {
          this.toastr.error(`Failed to import. ${e.message}`);
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
              await this.suiteService.updateTestProject([projToEdit]);
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

  shareProject(p) {

  }

  async deleteProject(project: TreeTestProject) {
    let suitesToDelete = project.suites.map(s => s._id);
    try {
      await this.suiteService.deleteSuites(suitesToDelete);
      await this.suiteService.deleteTestprojects([project._id]);
      this.toastr.success('Project deleted.');
    } catch (e) {
      console.error('Failed to delete project', e);
      this.toastr.error(`Failed to delete project ${e.message}`);
    }
  }

  async deleteSuite(suiteId: string) {
    try {
      await this.suiteService.deleteSuites([suiteId]);
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
        console.log(suite, reqId)
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
