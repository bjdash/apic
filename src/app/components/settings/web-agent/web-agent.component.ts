import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApicAgentService } from 'src/app/services/apic-agent.service';
import { Toaster } from 'src/app/services/toaster.service';
import { AGENT_DEFAULT_CONF } from 'src/app/utils/constants';

@Component({
  selector: 'app-web-agent',
  templateUrl: './web-agent.component.html',
  styleUrls: ['./web-agent.component.scss']
})
export class WebAgentComponent implements OnInit {
  @Output() onSave: EventEmitter<boolean> = new EventEmitter();
  form: FormGroup;
  flags = {
    info: false
  }
  constructor(fb: FormBuilder, private apicAgentService: ApicAgentService, private toaster: Toaster) {
    let currentConfig = apicAgentService.refreshSavedCofig();
    this.form = fb.group({
      port: [currentConfig.port, [Validators.required]],
      timeoutMs: [currentConfig.timeoutMs, [Validators.required, Validators.min(10000)]]
    })
  }

  ngOnInit(): void {
  }

  saveSettings() {
    if (this.form.valid) {
      this.apicAgentService.saveConfig(this.form.value)
      this.onSave.next(true);
    } else {
      this.toaster.error('Invalid configuaration value.');
    }
  }
  reset() {
    this.form.patchValue(AGENT_DEFAULT_CONF);
    this.saveSettings();
  }
}
