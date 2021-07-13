import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { CompiledApiRequest } from 'src/app/models/CompiledRequest.model';
import { RunResponse } from 'src/app/models/RunResponse.model';
import { TestBuilderOption } from 'src/app/models/TestBuilderOption.model';
import { TestResponse } from 'src/app/models/TestResponse.model';
import { TestScript } from 'src/app/models/TestScript.model';
import { TesterService } from 'src/app/services/tester.service';
import { Toaster } from 'src/app/services/toaster.service';
import { Utils } from 'src/app/services/utils.service';
import { TEST_BUILDER_OPS } from 'src/app/utils/constants';

interface Test { str: string, val: string, status: any, error?: string }
export interface TestBuilderSave {
  tests: string,
  autoSave: boolean
}
@Component({
  selector: 'json-test-builder',
  templateUrl: './json-test-builder.component.html',
  styleUrls: ['./json-test-builder.component.scss']
})
export class JsonTestBuilderComponent implements OnInit {
  // @Input() save;
  @Input() options: TestBuilderOption;
  @Input() $request: CompiledApiRequest;
  @Input() $response: RunResponse;

  @Output() onSave = new EventEmitter<TestBuilderSave>();
  @Output() close = new EventEmitter<any>();

  ops = TEST_BUILDER_OPS;
  tests: Test[] = [];
  models = {
    input: '',
    radio: {
      eq: 'val', //val,body,header
      eqX: 'string', //number, boolean
      ex: 'ex', //ex, exnot
      is: 'string', //string, number, boolean, Array, object
      cont: 'cont', //cont, contnot
      gt: 'gt', //gt, gte
      lt: 'lt', //lt, lte
      in: 'in',
      env: 'env'
    }
  }

  flags = {
    selectedType: 'eq',
    saved: true,
    hideRun: false
  };
  constructor(private utils: Utils, private toaster: Toaster, private tester: TesterService) { }

  ngOnInit(): void {
    console.log(this.options)
    if (typeof this.options.val != 'object') this.models.input = this.options.val;
    else {
      this.models.input = JSON.stringify(this.options.val);
      this.models.radio.eqX = 'number'
    }
  }

  getKey(key: string) {
    if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
      return '.' + key;
    } else {
      return '["' + key + '"]';
    }
  }

  addTest() {
    this.flags.saved = false;
    var fld = this.options.parent + this.getKey(this.options.key);
    var op = this.ops[this.models.radio[this.flags.selectedType]];
    var test = '';
    var tStr = '';
    var inp = this.models.input;
    switch (this.flags.selectedType) {
      case 'is':
        if (this.models.radio.is === 'date') {
          op = this.ops.isDate;
        } else {
          op = this.ops.is;
        }
        op = op.replace('<key>', fld).replace('<val>', this.models.radio.is)
        break;
      case 'in':
        inp = JSON.stringify(this.models.input.split(','));
        op = op.replace('<key>', fld);
        op = op.replace('<val>', inp);
        break;
      case 'eq':
        op = op.replace('<key>', fld);
        inp = this.models.radio.eqX === 'string' ? ('"' + this.models.input + '"') : this.models.input;
        if (this.models.radio.eq === 'val') {
          op = op.replace('<val>', inp);
        } if (this.models.radio.eq === 'eqenv') {
          inp = 'env varaible ' + inp;
          op = op.replace('<val>', this.models.input);
        } else if (this.models.radio.eq === 'body') {
          inp = inp + ' field in body';
          op = op.replace('<val>', this.getKey(this.models.input));
        } else if (this.models.radio.eq === 'header') {
          inp = ' header ' + inp;
          op = op.replace('<val>', this.getKey(this.models.input));
        } else if (this.models.radio.eq === 'query') {
          inp = ' query param ' + inp;
          op = op.replace('<val>', this.getKey(this.models.input));
        }
      default:
        op = op.replace('<key>', fld);
        op = op.replace('<val>', this.models.input);
    }
    test = 'apic.test(\'<test>\', function(){\n\t' + op + ';\n})';


    //set the test String
    var tInp = (typeof inp === 'string') ? inp.replace(/\n/g, '') : inp;
    switch (this.flags.selectedType) {
      case 'eq':
        tStr = fld + ' should be equal to ' + tInp;
        break;
      case 'ex':
        tStr = fld + ' should ' + (this.models.radio['ex'] === 'ex' ? ' ' : 'not ') + 'exist in response';
        break;
      case 'is':
        tStr = fld + ' should be a(n) ' + this.models.radio['is'];
        break;
      case 'cont':
        tStr = fld + ' should ' + (this.models.radio['cont'] === 'cont' ? ' ' : 'not ') + 'contain ' + this.models.input;
        break;
      case 'in':
        tStr = fld + ' should match to any one value from ' + (typeof inp !== 'string' ? JSON.stringify(tInp) : tInp);
        break
      case 'gt':
        tStr = fld + ' should be greater than ' + (this.models.radio['gt'] === 'gt' ? ' ' : 'or equals to ') + this.models.input;
        break;
      case 'lt':
        tStr = fld + ' should be lesser than ' + (this.models.radio['lt'] === 'lt' ? ' ' : 'or equals to ') + this.models.input;
        break;
      case 'env':
        tStr = 'Store ' + fld + ' in an environment variable named ' + this.models.input;
        break;
    }
    test = test.replace('<test>', tStr);
    if (this.tests.some(t => t.str === tStr)) {
      this.toaster.error('Exactly similar test already added.')
    } else {
      this.tests.push({ str: tStr, val: test, status: null });
    }
  }

  delTest(index: number) {
    this.tests.splice(index, 1);
  }

  async runTests(tests?: Test[]) {
    if (!tests) tests = this.tests;
    var testStr = tests.reduce((acc, t) => { return acc + t.val + '\n' }, '')
    var script: TestScript = {
      type: 'tempTest',
      script: testStr,
      $request: this.$request,
      $response: this.$response
    };
    let runResponse: TestResponse = await this.tester.runScript(script);
    runResponse.tests.forEach(testResult => {
      let test = this.tests.find(t => t.str === testResult.name);
      test.status = testResult.success
      test.error = testResult.reason
    });
    // this.testError = runResponse.error //TODO:
  }

  saveTests(autoSave = false) {
    var tests = this.tests.reduce((acc, t) => { return acc + t.val + '\n' }, '')
    this.onSave.next({ tests, autoSave })
    this.flags.saved = true;
    this.tests = []
  }

  copyToClipboard(text) {
    this.utils.copyToClipboard(text);
  }
}
