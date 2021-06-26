import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { ChangeDetectorRef, Component, Input, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { Select, Store } from '@ngxs/store';
import { from, Observable, Subject } from 'rxjs';
import { delayWhen, takeUntil } from 'rxjs/operators';
import { ConfirmService } from 'src/app/directives/confirm.directive';
import { Env } from 'src/app/models/Envs.model';
import { ApiRequest } from 'src/app/models/Request.model';
import { Suite, SuiteReq } from 'src/app/models/Suite.model';
import { SuiteService } from 'src/app/services/suite.service';
import { Toaster } from 'src/app/services/toaster.service';
import { Utils } from 'src/app/services/utils.service';
import { EnvState } from 'src/app/state/envs.state';
import { SuitesStateSelector } from 'src/app/state/suites.selector';
import apic from 'src/app/utils/apic';

@Component({
  selector: 'app-tab-suite',
  templateUrl: './tab-suite.component.html',
  styleUrls: ['./tab-suite.component.scss']
})
export class TabSuiteComponent implements OnInit, OnDestroy {
  @Input() suiteId: string;
  @Select(EnvState.getAll) envs$: Observable<Env[]>;

  selectedSuite$: Observable<Suite>;
  selectedSuite: Suite;
  suiteReqs: SuiteReq[];
  reloadSuite: Suite;
  selectedReq: { req: SuiteReq, index: number } = {
    req: null,
    index: -1
  };
  wau: string;
  har: { file: string, requests: SuiteReq[], importType: 'auto' | 'file', excludeOptionReq: boolean } = {
    file: '',
    requests: [],
    importType: null,
    excludeOptionReq: true
  }
  run = {
    logs: ''
  }
  private updatedInBackground: 'update' | 'delete' = null;

  private pendingAction: Promise<any> = Promise.resolve(null);
  form: FormGroup;
  private _destroy: Subject<boolean> = new Subject<boolean>();
  flags = {
    running: false,
    editSuitName: false,
    editReq: false,
    editReqType: null,
    showReq: true,
    showHarPanel: false,
    showLogs: true
  }

  constructor(
    private store: Store,
    private toaster: Toaster,
    private suiteService: SuiteService,
    fb: FormBuilder,
    private confirmService: ConfirmService,
    private cd: ChangeDetectorRef,
    public utils: Utils
  ) {
    this.form = fb.group({
      name: [''],
      env: [''],
      multiRun: [false],
      runCount: [1],
      includeDebLog: [true],
      useInmemEnv: [true],
      updateInmemEnv: [true]
    });
    // this.harForm = fb.group({

    // });

    this.suiteService.updatedViaSync$.subscribe((notification) => {
      if (this.selectedSuite && notification?.ids.includes(this.selectedSuite._id)) {
        this.updatedInBackground = notification.type;
      }
    });
  }

  ngOnDestroy(): void {
    this._destroy.next();
    this._destroy.complete();
  }

  ngOnInit(): void {
    this.selectedSuite$ = this.store.select(SuitesStateSelector.getSuiteByIdDynamic(this.suiteId));
    this.selectedSuite$
      .pipe(takeUntil(this._destroy))
      .subscribe(s => {
        if (s && (s._modified > this.selectedSuite?._modified || !this.selectedSuite)) {
          if (this.updatedInBackground == 'update') {
            this.reloadSuite = s;
          } else {
            this.processSelectedSuite(s);
          }
        }
        else if (s == undefined && this.selectedSuite) {
          if (this.updatedInBackground == 'delete') {
            //TODO:
            // this.confirmService.alert({
            //   id: 'Sync:Project Deleted',
            //   confirmTitle: 'Project deleted',
            //   confirm: 'The selected API project has been deleted by its owner.',
            //   confirmOk: 'Ok'
            // }).then(() => {
            //   // this.router.navigate(['designer']);
            //   this.updatedInBackground = null;
            // }).catch(() => { })
          } else {
            // this.router.navigate(['designer'])
          }
        }
      })
  }

  processSelectedSuite(suite: Suite) {
    this.selectedSuite = suite;
    this.suiteReqs = this.selectedSuite?.reqs.map(r => { return { ...r } }) || [];
    let { name, env } = this.selectedSuite;
    if (!env) env = '';
    this.form.patchValue({ name, env });
  }

  async checkAndUpdateSuite(suiteToSave: Suite) {
    try {
      if (this.reloadSuite) {
        await this.confirmService.confirm({
          id: 'Sync:Suit Not Refreshed',
          confirmTitle: 'Stale data',
          confirm: 'The suite has been updated by another user and you dont have the latest changes. .',
          confirmOk: 'Fetch latest',
          confirmCancel: 'Override with current change'
        });
        this.reload();
      } else {
        this.updateSuite(suiteToSave)
      }
    } catch (e) {
      this.updateSuite(suiteToSave);
      this.reloadSuite = null;
      this.updatedInBackground = null;
    }
  }

  addBlankReq(index) {
    var blankReq: SuiteReq = {
      _id: apic.s12(),
      url: '(blank)',
      prescript: '//add your pre request scripts here. \n',
      postscript: '//add your test scripts here. \n',
      name: '(blank request)',
      method: 'GET',
      description: '(blank)',
      disabled: false,
      Req: {
        headers: [{ key: '', val: '' }],
        url_params: [{ key: '', val: '' }],
      },
      Body: {
        formData: [{ key: '', val: '' }],
        xForms: [{ key: '', val: '' }]
      }
    }

    this.suiteReqs.splice(index, 0, blankReq);
    this.checkAndUpdateSuite({ ...this.selectedSuite, reqs: [...this.suiteReqs] });
  }

  async updateSuite(suiteToSave: Suite) {
    try {
      await this.suiteService.updateSuites([{ ...suiteToSave }]);
      this.flags.editSuitName = false;
      this.toaster.success('Suite updated.');
    } catch (e) {
      console.log('Failed to update suite', e);
      this.toaster.error(`Failed to update suite: ${e.message}`)
    }
  }

  duplicateReqInSuit(req: SuiteReq) {
    var newReq: SuiteReq = { ...Utils.clone(req), _id: apic.s12() };
    let duplicate = false;
    do {
      newReq.name = newReq.name + ' copy'
      duplicate = this.suiteReqs.findIndex(r => r.name?.toLocaleLowerCase() == newReq.name.toLocaleLowerCase()) > -1;
    } while (duplicate);

    this.checkAndUpdateSuite({ ...this.selectedSuite, reqs: [...this.suiteReqs, newReq] });
  }

  removeReqFromSuit(reqId: string, index: number) {
    if (this.suiteReqs[index]?._id === reqId) {
      this.suiteReqs.splice(index, 1);
      this.checkAndUpdateSuite({ ...this.selectedSuite, reqs: [...this.suiteReqs] });
    }
  }

  reload() {
    this.processSelectedSuite(this.reloadSuite);
    this.reloadSuite = null;
    this.updatedInBackground = null;
  }

  enableSuiteRename() {
    this.flags.editSuitName = true;
    setTimeout(() => {
      document.getElementById(`suite_${this.selectedSuite._id}`).focus();
    }, 0);
  }
  renameSuite() {
    let suiteToSave: Suite = { ...this.selectedSuite, name: this.form.value.name };
    this.checkAndUpdateSuite(suiteToSave);
  }
  reqStatusChange(event: MatCheckboxChange, index) {
    this.suiteReqs[index].disabled = !event.checked;
    this.checkAndUpdateSuite({ ...this.selectedSuite, reqs: this.suiteReqs });
  }
  harReqStatusChange(event: MatCheckboxChange, index) {
    this.har.requests[index].disabled = !event.checked;
  }

  enableSuitReqEdit(req: SuiteReq, index, type: 'harReq' | 'suitReq') {
    this.flags.editReqType = type;
    this.flags.editReq = true;
    this.selectedReq = { req, index };
  }

  onSuitReqSave(req: ApiRequest) {
    let reqToSave: SuiteReq = { ...this.selectedReq.req, ...req };
    console.log(reqToSave)

    if (this.flags.editReqType === 'harReq') {
      this.har.requests[this.selectedReq.index] = reqToSave;
    } else {
      this.suiteReqs[this.selectedReq.index] = reqToSave;
      this.checkAndUpdateSuite({ ...this.selectedSuite, reqs: this.suiteReqs });
    }
  }

  discardReqEdit() {
    // if (vm.ctrls.editReqType === 'harReq') {
    //     vm.har.requests[vm.selectedReqIndex] = vm.selectedReqCopy;
    // } else {
    //     vm.suit.reqs[vm.selectedReqIndex] = vm.selectedReqCopy;
    // }
    this.flags.editReq = false;
  }
  getPrevReq() {
    if (this.flags.editReqType === 'suitReq') {
      return this.suiteReqs[this.selectedReq.index - 1];
    } else {
      return this.har.requests[this.selectedReq.index - 1];
    }
  }

  getNextReq() {
    if (this.flags.editReqType === 'suitReq') {
      return this.suiteReqs[this.selectedReq.index + 1];
    } else {
      return this.har.requests[this.selectedReq.index + 1];
    }
  }

  onFileChange(event) {
    const reader = new FileReader();
    if (event.target.files && event.target.files.length) {
      const [file] = event.target.files;

      reader.onloadend = (e) => {
        if (e.target.readyState === FileReader.DONE) { // DONE == 2
          this.har.file = e.target.result as string;
          // // need to run CD since file load runs outside of zone
          this.cd.markForCheck();
        }
      };
      reader.readAsBinaryString(file);
    }
  }

  processHarFile() {
    try {
      var harData = JSON.parse(this.har.file);
      var entries = harData.log.entries;
      this.processHarEntries(entries);
      console.log(this.har.requests);
    } catch (e) {
      console.log("HAR import failed.", e);
      this.toaster.error(
        "Import Failed. Please make sure you are importing a valid HAR file. " +
        e.message
      );
    }
  }

  private processHarEntries(entries) {
    this.har.requests = [];
    entries.forEach((entry) => {
      var apicReq: SuiteReq;
      try {
        apicReq = { ...Utils.harToApicReq(entry), disabled: false };
      } catch (e) {
        console.log('Failed to parse HAR request', e);
        this.toaster.error('Failed to parse one HAR request. ' + e.message);
      }
      if (apicReq) {
        if (apicReq.method === 'OPTIONS' && this.har.excludeOptionReq) {
          console.debug('Skipping options request')
        } else {
          this.har.requests.push(apicReq);
        }
      }
    });
  }

  addRequestsToSuit(requests: SuiteReq[]) {
    this.checkAndUpdateSuite({ ...this.selectedSuite, reqs: [...this.suiteReqs, ...requests] });
  }

  drop(event: CdkDragDrop<string[]>) {
    moveItemInArray(this.suiteReqs, event.previousIndex, event.currentIndex);
    this.checkAndUpdateSuite({ ...this.selectedSuite, reqs: this.suiteReqs });
  }

  loadWAU() {

  }
  trackByFn(index, item) {
    return index;
  }
}
