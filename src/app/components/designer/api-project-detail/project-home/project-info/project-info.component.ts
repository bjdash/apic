import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ApiProject } from 'src/app/models/ApiProject.model';
import { Env } from 'src/app/models/Envs.model';
import { ApiProjectService } from 'src/app/services/apiProject.service';
import { EnvService } from 'src/app/services/env.service';
import { Toaster } from 'src/app/services/toaster.service';

@Component({
  selector: 'app-project-info',
  templateUrl: './project-info.component.html'
})
export class ProjectInfoComponent implements OnInit, OnChanges {
  @Input() selectedPROJ: ApiProject;
  @Input() updateApiProject: Function;
  @Input() projEnv: Env = null; //auto generated env for this project
  @Output() onChange = new EventEmitter<any>();

  projDetailForm: FormGroup;
  flags = {
    editProj: false
  }

  constructor(
    fb: FormBuilder,
    private apiProjService: ApiProjectService,
    private toaster: Toaster,
    private envService: EnvService
  ) {
    this.projDetailForm = fb.group({
      title: ['', Validators.required],
      version: ['', Validators.required],
      description: [''],
      termsOfService: [''],
      license: fb.group({
        name: [''],
        url: ['']
      }),
      contact: fb.group({
        name: [''],
        url: [''],
        email: ['']
      })
    });

    this.projDetailForm.valueChanges.subscribe(data => {
      this.onChange.next({ dirty: true });
    })
  }
  ngOnChanges(changes: SimpleChanges): void {
    if (changes.selectedPROJ) {
      setTimeout(() => {
        this.resetProjInfoEdit();
      }, 0);
    }
  }

  ngOnInit(): void {
    this.resetProjInfoEdit()
  }

  saveProjEdit() {
    if (!this.projDetailForm.valid) return;
    const formValue = this.projDetailForm.value;
    let envUpdateRequired = false;

    if (this.selectedPROJ.title !== formValue.title && this.selectedPROJ.setting) envUpdateRequired = true;

    var toSave: ApiProject = { ...this.selectedPROJ, ...formValue };

    this.apiProjService.updateAPIProject(toSave).then(() => {
      this.flags.editProj = false;
      this.toaster.success('Project details updated');
      this.onChange.next({ dirty: false });
      if (envUpdateRequired) {
        const envToUpdate: Env = { ...this.projEnv, name: toSave.title + '-env', proj: { ...this.projEnv.proj, name: toSave.title } }
        this.envService.updateEnv(envToUpdate);
      }
    });
  }

  resetProjInfoEdit() {
    this.projDetailForm.patchValue({
      title: this.selectedPROJ.title,
      version: this.selectedPROJ.version,
      description: this.selectedPROJ.description,
      termsOfService: this.selectedPROJ.termsOfService,
      license: {
        name: this.selectedPROJ.license ? this.selectedPROJ.license.name : '',
        url: this.selectedPROJ.license ? this.selectedPROJ.license.url : ''
      },
      contact: {
        name: this.selectedPROJ.contact ? this.selectedPROJ.contact.name : '',
        url: this.selectedPROJ.contact ? this.selectedPROJ.contact.url : '',
        email: this.selectedPROJ.contact ? this.selectedPROJ.contact.email : ''
      }
    });
    this.onChange.next({ dirty: false });
  }

  enableEdit() {
    this.flags.editProj = true;
    setTimeout(() => {
      document.getElementById('proj-info-title').focus();
    }, 0);
  }
}
