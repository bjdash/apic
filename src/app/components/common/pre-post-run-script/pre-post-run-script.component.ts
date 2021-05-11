import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { MatTabChangeEvent } from '@angular/material/tabs';
import { Utils } from 'src/app/services/utils.service';
import { TestSnips } from 'src/app/utils/constants';
import { ApicAceComponent } from '../apic-ace/apic-ace.component';

@Component({
  selector: 'pre-post-run-script',
  templateUrl: './pre-post-run-script.component.html',
  styleUrls: ['./pre-post-run-script.component.scss']
})
export class PrePostRunScriptComponent implements OnInit {
  @ViewChild('preRunAce') preRunAce: ApicAceComponent;
  @ViewChild('postRunAce') postRunAce: ApicAceComponent;
  @Input() prerun: string;
  @Output() prerunChange = new EventEmitter();
  @Input() postrun: string;
  @Output() postrunChange = new EventEmitter();

  testSnips = TestSnips;
  scriptType: 'prerun' | 'postrun' = 'prerun';

  constructor() { }

  ngOnInit(): void {
  }

  addCodeSnip(snip, e?) {
    e?.preventDefault();
    let script = '';
    if (snip.hasOwnProperty('params')) {
      script += snip.code.replace('<<assert>>', Utils.assertBuilder.apply(null, snip.params));
    } else {
      script += snip.code;
    }

    if (this.scriptType == 'prerun') {
      this.prerun += (this.prerun ? '\n' : '') + script;
      this.prerunUpdated();
    } else {
      this.postrun += (this.postrun ? '\n' : '') + script;
      this.postrunUpdated();
    }
  }

  prerunUpdated() {
    setTimeout(() => {
      this.prerunChange.emit(this.prerun);
    }, 0);
  }
  postrunUpdated() {
    setTimeout(() => {
      this.postrunChange.emit(this.postrun)
    }, 0);
  }

  tabChange(event: MatTabChangeEvent) {
    if (event.index === 0) {
      this.scriptType = 'prerun';
      this.preRunAce.refresh();
      this.preRunAce.focus();
    } else {
      this.scriptType = 'postrun';
      this.postRunAce.refresh();
      this.postRunAce.focus();
    }
  }
  trackByFn(index, item) {
    return index;
  }
}
