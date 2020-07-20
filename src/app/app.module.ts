import { EnvState } from './state/envs.state';
import { EnvService } from './services/env.service';
import { NewApiProjectModal } from './modals/newApiProject/newApiProject.modal.component';
import { AuthInterceptor } from './utils/AuthInterceptor';
import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { NgxsModule } from '@ngxs/store';
import { ReactiveFormsModule } from '@angular/forms';
import { NgJsonSchemaBuilder } from 'ng-json-schema-builder';


import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatRippleModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { MatTabsModule } from '@angular/material/tabs';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatSelectModule } from '@angular/material/select';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HeaderComponent } from './header/header.component';
import { DesignerComponent } from './designer/designer.component';
import { DocsComponent } from './docs/docs.component';
import { ApiProjectState } from './state/apiProjects.state';
import { ApiProjectService } from './services/apiProject.service';
import { Toaster } from './services/toaster.service';
import { FormValidatorDirective } from './directives/form-validator.directive';
import { ApiProjectDetailComponent } from './api-project-detail/api-project-detail.component';
import { ProjectHomeComponent } from './api-project-detail/project-home/project-home.component';
import { ProjectFolderComponent } from './api-project-detail/project-folder/project-folder.component';
import { ConfirmDirective, ConfirmDirectiveComponent, ConfirmService } from './directives/confirm.directive';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { AppBootstrap } from './utils/appBootstrap';
import { ProjectModelsComponent } from './api-project-detail/project-models/project-models.component';


@NgModule({
  declarations: [
    FormValidatorDirective,
    ConfirmDirective,
    ConfirmDirectiveComponent,
    AppComponent,
    HeaderComponent,
    DesignerComponent,
    DocsComponent,
    NewApiProjectModal,
    ApiProjectDetailComponent,
    ProjectHomeComponent,
    ProjectFolderComponent,
    ProjectModelsComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    ReactiveFormsModule,
    NgxsModule.forRoot([
      ApiProjectState,
      EnvState
    ]),
    BrowserAnimationsModule,
    NgJsonSchemaBuilder,
    MatButtonModule,
    MatIconModule,
    MatRippleModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatDialogModule,
    MatTabsModule,
    MatMenuModule,
    MatDividerModule,
    MatSelectModule,
    ScrollingModule
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    AppBootstrap,
    ApiProjectService,
    EnvService,
    Toaster,
    ConfirmService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
