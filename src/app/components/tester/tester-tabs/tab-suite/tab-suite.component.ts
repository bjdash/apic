import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { ChangeDetectorRef, Component, Input, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { Select, Store } from '@ngxs/store';
import { from, Observable, Subject } from 'rxjs';
import { delayWhen, map, take, takeUntil } from 'rxjs/operators';
import { ConfirmService } from 'src/app/directives/confirm.directive';
import { Env, ParsedEnv } from 'src/app/models/Envs.model';
import { ApiRequest } from 'src/app/models/Request.model';
import { RunResult } from 'src/app/models/RunResult.model';
import { Suite, SuiteReq } from 'src/app/models/Suite.model';
import { AuthService } from 'src/app/services/auth.service';
import { FileSystem } from 'src/app/services/fileSystem.service';
import { ReporterService } from 'src/app/services/reporter.service';
import { RequestRunnerService } from 'src/app/services/request-runner.service';
import { SuiteService } from 'src/app/services/suite.service';
import { Toaster } from 'src/app/services/toaster.service';
import { Utils } from 'src/app/services/utils.service';
import { EnvState } from 'src/app/state/envs.state';
import { SuitesStateSelector } from 'src/app/state/suites.selector';
import apic from 'src/app/utils/apic';
import { TesterTabsService } from '../tester-tabs.service';

@Component({
  selector: 'app-tab-suite',
  templateUrl: './tab-suite.component.html',
  styleUrls: ['./tab-suite.component.scss']
})
export class TabSuiteComponent implements OnInit, OnDestroy {
  @Input() suiteId: string;
  @Input() reqToOpen: string;
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
    logs: '',
    reqCount: 0,
    runCounter: 0, //current suite run counter
    requestCounter: 0,//which request is currently running
    results: [],
    stats: {
      testsTotal: 0,
      testsFailed: 0,
      testsPassed: 0,
      reqsTotal: 0,
      reqsPassed: 0,
      reqsFailed: 0
    }
  }
  private updatedInBackground: 'update' | 'delete' = null;

  private pendingAction: Promise<any> = Promise.resolve(null);
  form: FormGroup;
  private _destroy: Subject<boolean> = new Subject<boolean>();
  flags = {
    running: undefined,
    editSuitName: false,
    editReq: false,
    editReqType: null,
    showReq: true,
    showHarPanel: false,
    showLogs: true,
    aborted: false,
    showResp: false,
    wauLoading: false
  }

  constructor(
    private store: Store,
    private toaster: Toaster,
    private suiteService: SuiteService,
    fb: FormBuilder,
    private confirmService: ConfirmService,
    private cd: ChangeDetectorRef,
    public utils: Utils,
    private runner: RequestRunnerService,
    private reporterService: ReporterService,
    private fileSystem: FileSystem,
    private authService: AuthService,
    private tabService: TesterTabsService
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
            //TODO: Instead of closing the tab, give the user an option to save it as new 
            this.confirmService.alert({
              id: 'Sync:Suite Deleted' + this.selectedSuite._id,
              confirmTitle: 'Suite deleted',
              confirm: `The test suite '${this.selectedSuite.name}' has been deleted by its owner. The opened suite tab will now close.`,
              confirmOk: 'Ok'
            }).then(() => {
              this.tabService.removeTab(this.selectedSuite._id)
              this.updatedInBackground = null;
            }).catch(() => { })
          } else {
            this.tabService.removeTab(this.selectedSuite._id)
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
    if (this.reqToOpen) {
      let index = this.suiteReqs.findIndex(r => r._id === this.reqToOpen);
      this.reqToOpen = null;
      this.enableSuitReqEdit(this.suiteReqs[index], index, 'suitReq');
    }
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

  async updateSuite(suiteToSave: Suite) {
    try {
      await this.suiteService.updateSuite({ ...suiteToSave });
      this.flags.editSuitName = false;
      this.toaster.success('Suite updated.');
    } catch (e) {
      console.error('Failed to update suite', e);
      this.toaster.error(`Failed to update suite: ${e?.message || e || ''}`)
    }
  }

  async prepareAndRunSuite() {
    this.flags.aborted = false;
    this.flags.running = true;
    this.flags.showResp = true;
    this.run.results = [];
    this.run.stats = this.resetStats();
    this.run.reqCount = this.suiteReqs.length;
    this.run.runCounter = 1;
    this.resetLog();

    this.addLog(`Running suite: ${this.selectedSuite.name}`);

    let selectedEnv: ParsedEnv = await this.store.select(EnvState.getByIdParsed)
      .pipe(map(filterFn => filterFn(this.form.value.env)))
      .pipe(take(1))
      .toPromise();
    if (selectedEnv) {
      this.addLog('Selected environment: ' + selectedEnv.name);
    } else {
      this.addLog('Selected environment: None');
    }

    let runConfig = { ...this.form.value };
    if (runConfig.multiRun) {
      this.addLog(`Suite run count is  ${runConfig.runCount}`);
      if (runConfig.runCount > 1000) {
        this.toaster.error('Currently a run upto 1000 times is supported.');
        runConfig.runCount = 1000;
        this.addLog('Run count was greater than 1000. Using default count 1000.');
      }
    } else {
      runConfig.runCount = 1;
    }
    if (!runConfig.runCount || runConfig.runCount < 1) {
      runConfig.runCount = 1;
      this.addLog('Run count was undefined or less than 1. Using default count 1.');
    }

    this.addLog(`Total number of requests:  ${this.run.reqCount} . Disabled requests will be skipped.`);
    for (var i = 0; i < this.run.reqCount; i++) {
      const { _id, name, url, method, disabled } = this.suiteReqs[i];
      this.run.results.push({ _id, name, url, method, disabled });
    }

    while (this.run.runCounter <= runConfig.runCount && !this.flags.aborted) {
      if (runConfig.runCount > 1) {
        this.addLog('\n╔══════════════════════════════════════╗')
        this.addLog(`    Suite run count: ${this.run.runCounter}`);
        this.addLog('╚══════════════════════════════════════╝')
      }
      for (var i = 0; i < this.suiteReqs.length; i++) {
        if (this.flags.aborted) break;
        try {
          this.run.requestCounter = i;
          this.addLog('\n─────────────────────────────────────')
          this.addLog(`${i + 1}: ${this.suiteReqs[i].name}`)
          this.addLog('─────────────────────────────────────')
          let result: RunResult = await this.runner.run(this.suiteReqs[i], { useEnv: { ...selectedEnv }, useInMemEnv: runConfig.useInmemEnv, skipinMemUpdate: !runConfig.updateInmemEnv });
          this.processResponse(result, i);
          //if option to not update inmem env selected so get the in mem envs updated by previous request and set it to selected env
          if (!runConfig.updateInmemEnv) {
            if (!selectedEnv) selectedEnv = { _id: 'auto', name: 'auto', vals: {} }
            selectedEnv.vals = { ...selectedEnv.vals, ...(result.$response.inMemEnvs || {}) }
          }
        } catch (e) {
          this.addLog(`ERROR___`, true)
          this.addLog(`Error while running request: ${this.suiteReqs[i].name}`, true)
          this.addLog(`${e.message}`, true)
        }
      }
      this.run.runCounter++;
    }

    this.flags.running = false;
  }

  processResponse(result: RunResult, reqIndex: number) {
    this.run.stats.reqsTotal++;
    if (result.$response.logs) {
      this.addLog('Logs from pre/post run script:')
      result.$response.logs.forEach(log => {
        this.addLog(`> ${log}`, true);
      })
    }
    this.run.results[reqIndex].status = 'complete';
    this.run.results[reqIndex].response = result.$response;
    this.run.results[reqIndex].url = result.$request.url;
    this.run.results[reqIndex].tests = {
      cases: result.$response.tests,
      passed: result.$response.tests.filter(test => test.success).length,
      failed: result.$response.tests.filter(test => !test.success).length
    };
    this.run.results[reqIndex].tests.total = result.$response.tests.length;
    this.run.stats.testsTotal += this.run.results[reqIndex].tests.total;
    this.run.stats.testsFailed += this.run.results[reqIndex].tests.failed;
    this.run.stats.testsPassed += this.run.results[reqIndex].tests.passed;
    if (this.run.results[reqIndex].tests.failed) {
      this.run.stats.reqsFailed++;
    } else {
      this.run.stats.reqsPassed++;
    }

    this.addLog('Status: ' + this.run.results[reqIndex].response.status + ' ' + this.run.results[reqIndex].response.statusText);
    this.addLog('Time taken: ' + this.run.results[reqIndex].response.timeTakenStr);
    this.addLog('Tests: ');
    for (var i = 0; i < this.run.results[reqIndex].tests.cases.length; i++) {
      this.addLog(' ■ ' + this.run.results[reqIndex].tests.cases[i].name + ' : ' + (this.run.results[reqIndex].tests.cases[i].success ? 'Passed' : 'Failed'));
    }
  }

  abortRun() {
    this.flags.running = false;
    this.flags.aborted = true;
    this.runner.abort();
  }

  addLog(msg: string, force?: boolean) {
    if (!this.form.value.includeDebLog && !force)
      return;
    this.run.logs += '\r\n' + msg;
  }

  resetLog() {
    this.run.logs = '';
  }

  resetStats() {
    return {
      testsTotal: 0,
      testsFailed: 0,
      testsPassed: 0,
      reqsTotal: 0,
      reqsPassed: 0,
      reqsFailed: 0
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

  addSavedReq(index) {
    this.suiteService.initAddReq(this.selectedSuite, index);
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
  envChanged() {
    let suiteToSave: Suite = { ...this.selectedSuite, env: this.form.value.env };
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
    } catch (e) {
      console.error("HAR import failed.", e);
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
        console.error('Failed to parse HAR request', e);
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

  async loadWAU() {
    if (this.selectedSuite._id.indexOf('-demo') > 0) {
      this.wau = 'https://apic.app/api/webAccess/APICSuite/123456abcdef-testsuite-demo?token=apic-demo-suite';
      return;
    }
    if (!this.authService.isLoggedIn()) return;
    try {
      this.flags.wauLoading = true;
      this.wau = await this.suiteService.loadWau(this.selectedSuite._id)
    } catch (e) {
      console.error('Failed to load web access url.', e);
      this.toaster.error(`Failed to load web access url. ${e.error?.desc || ''}`);
    }
    this.flags.wauLoading = false;
  }
  async downloadReport() {
    let report = await this.reporterService.suitReport(this.run, this.selectedSuite.name)
    this.fileSystem.download(this.selectedSuite.name + "-apic_report.html", report);
  }
  saveResult() {
    this.toaster.info('Coming Soon');
  }
  trackByFn(index, item) {
    return index;
  }
}
