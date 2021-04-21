import { T } from '@angular/cdk/keycodes';
import { Component, Input, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { Test } from 'src/app/models/TestResponse.model';

@Component({
  selector: 'app-resp-tab-tests',
  templateUrl: './resp-tab-tests.component.html',
  styleUrls: ['./resp-tab-tests.component.scss']
})
export class RespTabTestsComponent implements OnInit {
  @Input() tests: Test[];
  filter: FormControl = new FormControl();
  filtered$: Observable<any>;

  constructor() { }

  ngOnInit(): void {
    this.filter.setValue('All')
    this.filtered$ = this.filter.valueChanges
      .pipe(startWith('All'),
        map(value => this._filter(value))
      );
  }

  private _filter(value: string): Test[] {
    return this.tests.filter((test: Test) => {
      return value === 'All' || (value === 'Passed' && test.success) || (value === 'Failed' && !test.success)
    });
  }

  passedTests() {
    return this.tests.filter(test => test.success)
  }
  failedTests() {
    return this.tests.filter(test => !test.success)
  }
}
