import { UserState } from './state/user.state';
import { EnvState } from './state/envs.state';
import { EnvService } from './services/env.service';
import { NewApiProjectModal } from './components/designer/newApiProject/newApiProject.modal.component';
import { AuthInterceptor } from './utils/AuthInterceptor';
import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { NgxsModule } from '@ngxs/store';
import { NgxsReduxDevtoolsPluginModule } from '@ngxs/devtools-plugin';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { AceEditorModule } from 'ng2-ace-editor';

import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatRippleModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogConfig, MatDialogModule, MAT_DIALOG_DEFAULT_OPTIONS } from '@angular/material/dialog';
import { MatTabsModule } from '@angular/material/tabs';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatListModule } from '@angular/material/list';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatRadioModule } from '@angular/material/radio';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatBadgeModule } from '@angular/material/badge';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HeaderComponent } from './components/header/header.component';
import { DesignerComponent } from './components/designer/designer.component';
import { DocsComponent } from './components/docs/docs.component';
import { ApiProjectState } from './state/apiProjects.state';
import { ApiProjectService } from './services/apiProject.service';
import { Toaster } from './services/toaster.service';
import { FormValidatorDirective } from './directives/form-validator.directive';
import { ApiProjectDetailComponent } from './components/designer/api-project-detail/api-project-detail.component';
import { ProjectHomeComponent } from './components/designer/api-project-detail/project-home/project-home.component';
import { ProjectFolderComponent } from './components/designer/api-project-detail/project-folder/project-folder.component';
import { ProjectTraitsComponent } from './components/designer/api-project-detail/project-traits/project-traits.component';
import { ProjectEndpointComponent } from './components/designer/api-project-detail/project-endpoint/project-endpoint.component';
import { ProjectModelsComponent } from './components/designer/api-project-detail/project-models/project-models.component';
import {
  ConfirmDirective,
  ConfirmDirectiveComponent,
  ConfirmService,
} from './directives/confirm.directive';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { AppBootstrap } from './utils/appBootstrap';
import { ApicTagEditorComponent } from './components/common/apic-tag-editor/apic-tag-editor.component';
import { Utils } from './services/utils.service';
import { ResponseBuilderItem } from './components/common/response-schema-builder/response-builder-item.component';
import { ResponseSchemaBuilderComponent } from './components/common/response-schema-builder/response-schema-builder.component';
import { EnvsComponent } from './components/envs/envs.component';
import { OnlyAlphaNumericInputDirective } from './directives/only-alpha-numeric-input.directive';
import { FileSystem } from './services/fileSystem.service';
import { ImportProjectComponent } from './components/designer/import-project/import-project.component';
import { SwaggerService } from './services/swagger.service';
import { ProjectExportModalComponent } from './components/designer/api-project-detail/project-export-modal/project-export-modal.component';
import { LoginComponent } from './components/login/login.component';
import { HttpService } from './services/http.service';
import { StompService } from './services/stomp.service';
import { SyncService } from './services/sync.service';
import { OfflineComponent } from './components/common/offline/offline.component';
import { SettingsComponent } from './components/settings/settings.component';
import { ThemesComponent } from './components/settings/themes/themes.component';
import { WebClientComponent } from './components/settings/web-client/web-client.component';
import { SecurityDefComponent } from './components/designer/api-project-detail/project-home/security-def/security-def.component';
import { environment } from 'src/environments/environment';
import { KeyValueEditorComponent } from './components/common/key-value-editor/key-value-editor.component';
import { ProjSettingsComponent } from './components/designer/api-project-detail/project-home/proj-settings/proj-settings.component';
import { JsonSchemaComponent } from './components/common/json-schema-builder/jsonschema.component';
import { MainJsonSchemaComponent } from './components/common/json-schema-builder/main/main.component';
import { SelectSchemaJsonSchemaComponent } from './components/common/json-schema-builder/field/selectschema.component';
import { FieldJsonSchemaComponent } from './components/common/json-schema-builder/field/field.component';
import { JsonSchemaStateService } from './components/common/json-schema-builder/schemaState.service';
import { EndpBodyParamsComponent } from './components/designer/api-project-detail/project-endpoint/endp-body-params/endp-body-params.component';
import { ApicAceComponent } from './components/common/apic-ace/apic-ace.component';
import { AceResizeDirective } from './directives/ace-resize.directive';
import { PrePostRunScriptComponent } from './components/common/pre-post-run-script/pre-post-run-script.component';
import { TesterMainComponent } from './components/tester/tester-main.component';
import { TesterLeftNavComponent } from './components/tester/tester-left-nav/tester-left-nav.component';
import { TesterLeftNavRequestsComponent } from './components/tester/tester-left-nav/tester-left-nav-requests/tester-left-nav-requests.component';
import { RequestsState } from './state/requests.state';
import { TreeSelectorComponent } from './components/common/tree-selector/tree-selector.component';
import { TesterTabsComponent } from './components/tester/tester-tabs/tester-tabs.component';
import { TabRequestComponent } from './components/tester/tester-tabs/tab-request/tab-request.component';
import { TabSocketComponent } from './components/tester/tester-tabs/tab-socket/tab-socket.component';
import { ApicRichInputComponent } from './components/common/apic-rich-input/apic-rich-input.component';
import { BasicAuthComponent } from './components/tester/tester-tabs/tab-request/basic-auth/basic-auth.component';
import { RememberService } from './services/remember.service';
import { RouteReuseStrategy } from '@angular/router';
import { ApicRouteReuseStrategy } from './ApicRouteReuseStrategy';
import { SaveReqDialogComponent } from './components/tester/save-req-dialog/save-req-dialog.component';
import { TesterTabsService } from './components/tester/tester-tabs/tester-tabs.service';
import { TesterService } from './services/tester.service';
import { RespTabTestsComponent } from './components/tester/tester-tabs/tab-request/resp-tab-tests/resp-tab-tests.component';
import { BearerAuthComponent } from './components/tester/tester-tabs/tab-request/bearer-auth/bearer-auth.component';
import { JsonViewerComponent } from './components/common/json-viewer/json-viewer.component';
import { JsonTestBuilderComponent } from './components/common/json-test-builder/json-test-builder.component';
import { ReqHistoryService } from './services/reqHistory.service';
import { ReqHistoryState } from './state/history.state';
import { MigrationService } from './services/migration.service';
import { TesterLeftNavHistoryComponent } from './components/tester/tester-left-nav/tester-left-nav-history/tester-left-nav-history.component';
import { RecaptchaFormsModule, RecaptchaModule } from 'ng-recaptcha';
import { LogoutComponent } from './components/login/logout/logout.component';
import { TesterLeftNavSuitesComponent } from './components/tester/tester-left-nav/tester-left-nav-suites/tester-left-nav-suites.component';
import { SuitesState } from './state/suites.state';

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
    ProjectModelsComponent,
    ProjectEndpointComponent,
    ApicTagEditorComponent,
    ProjectTraitsComponent,
    ResponseBuilderItem,
    ResponseSchemaBuilderComponent,
    EnvsComponent,
    OnlyAlphaNumericInputDirective,
    ImportProjectComponent,
    ProjectExportModalComponent,
    LoginComponent,
    OfflineComponent,
    SettingsComponent,
    ThemesComponent,
    WebClientComponent,
    SecurityDefComponent,
    KeyValueEditorComponent,
    ProjSettingsComponent,
    JsonSchemaComponent,
    MainJsonSchemaComponent,
    SelectSchemaJsonSchemaComponent,
    FieldJsonSchemaComponent,
    EndpBodyParamsComponent,
    ApicAceComponent,
    AceResizeDirective,
    PrePostRunScriptComponent,
    TesterMainComponent,
    TesterLeftNavComponent,
    TesterLeftNavRequestsComponent,
    TreeSelectorComponent,
    TesterTabsComponent,
    TabRequestComponent,
    TabSocketComponent,
    ApicRichInputComponent,
    BasicAuthComponent,
    SaveReqDialogComponent,
    RespTabTestsComponent,
    BearerAuthComponent,
    JsonViewerComponent,
    JsonTestBuilderComponent,
    TesterLeftNavHistoryComponent,
    LogoutComponent,
    TesterLeftNavSuitesComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    ReactiveFormsModule,
    FormsModule,
    NgxsModule.forRoot([ApiProjectState, EnvState, UserState, RequestsState, ReqHistoryState, SuitesState], {
      developmentMode: !environment.production,
      selectorOptions: {
        suppressErrors: false,
        injectContainerState: false
      }
    }),
    NgxsReduxDevtoolsPluginModule.forRoot(),
    BrowserAnimationsModule,
    AceEditorModule,
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
    MatChipsModule,
    MatListModule,
    MatRadioModule,
    MatCheckboxModule,
    MatAutocompleteModule,
    MatBadgeModule,
    ScrollingModule,
    RecaptchaModule,
    RecaptchaFormsModule, // if you need forms support
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    { provide: MAT_DIALOG_DEFAULT_OPTIONS, useValue: { ...new MatDialogConfig(), position: { top: '50px' } } },
    AppBootstrap,
    MigrationService,
    ApiProjectService,
    JsonSchemaStateService,
    EnvService,
    Toaster,
    Utils,
    ConfirmService,
    FileSystem,
    SwaggerService,
    HttpService,
    StompService,
    SyncService,
    RememberService,
    TesterTabsService,
    TesterService,
    ReqHistoryService
  ],
  bootstrap: [AppComponent],
})
export class AppModule { }
