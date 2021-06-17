import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Select, Store } from '@ngxs/store';
import { from, Observable, Subject } from 'rxjs';
import { delayWhen, takeUntil } from 'rxjs/operators';
import { Env } from 'src/app/models/Envs.model';
import { Suite } from 'src/app/models/Suite.model';
import { SuiteService } from 'src/app/services/suite.service';
import { Toaster } from 'src/app/services/toaster.service';
import { EnvState } from 'src/app/state/envs.state';
import { SuitesStateSelector } from 'src/app/state/suites.selector';

@Component({
  selector: 'app-tab-suite',
  templateUrl: './tab-suite.component.html',
  styleUrls: ['./tab-suite.component.scss']
})
export class TabSuiteComponent implements OnInit, OnDestroy {
  @Input() suiteId: string;
  @Select(EnvState.getAll) envs$: Observable<Env[]>;

  selectedSuite: Suite;
  selectedSuite$: Observable<Suite>;
  private pendingAction: Promise<any> = Promise.resolve(null);

  form: FormGroup;
  private _destroy: Subject<boolean> = new Subject<boolean>();
  reloadSuite: Suite;
  flags = {
    running: false,
    editSuitName: false,
    editReq: false
  }

  constructor(
    private store: Store,
    private toaster: Toaster,
    private suiteService: SuiteService,
    fb: FormBuilder
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
  }

  ngOnDestroy(): void {
    this._destroy.next();
    this._destroy.complete();
  }

  ngOnInit(): void {
    this.selectedSuite$ = this.store.select(SuitesStateSelector.getSuiteByIdDynamic(this.suiteId));

    this.selectedSuite$
      .pipe(delayWhen(() => from(this.pendingAction)))
      .pipe(takeUntil(this._destroy))
      // .pipe(delay(0))
      .subscribe(suite => {
        if (suite && (suite._modified > this.selectedSuite?._modified || !this.selectedSuite)) {
          if (this.selectedSuite) {
            //TODO: Implement a field level matching logic 
            //so that if any non form fields are updated such as name, savedResponse etc 
            //then directly just update the request instead of asking the user if they want to reload
            this.reloadSuite = suite;
          } else {
            setTimeout(() => {
              this.processSelectedSuite(suite)
            }, 0);
          }
        } else if (suite == undefined && this.selectedSuite) {
          //tab got deleted
          alert('Suite deleted');
          // this.tabsService.updateTab(this.requestId, 'new_tab:' + apic.s8(), 'Deleted Tab: ' + this.selectedReq.name);
        }
      })
  }

  processSelectedSuite(suite: Suite) {
    console.log('Selected', suite);
    this.selectedSuite = suite;
    const { name, env } = this.selectedSuite;
    this.form.patchValue({ name, env });
  }

  enableSuiteRename() {
    this.flags.editSuitName = true;
    setTimeout(() => {
      document.getElementById(`suite_${this.selectedSuite._id}`).focus();
    }, 0);
  }
  async renameSuite() {
    let suiteToSave: Suite = { ...this.selectedSuite, name: this.form.value.name };
    try {
      await this.suiteService.updateSuites([suiteToSave]);
      this.flags.editSuitName = false;
      this.toaster.success('Suite renamed');
    } catch (e) {
      console.log('Failed to update suite', e);
      this.toaster.error(`Failed to update suite: ${e.message}`)
    }
  }
}
