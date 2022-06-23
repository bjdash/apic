import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { DesignerComponent } from './components/designer/designer.component';
import { DocsComponent } from './components/docs/docs.component';
import { ApiProjectDetailComponent } from './components/designer/api-project-detail/api-project-detail.component';
import { TesterMainComponent } from './components/tester/tester-main.component';
import { ProjectFolderComponent } from './components/designer/api-project-detail/project-folder/project-folder.component';
import { ProjectHomeComponent } from './components/designer/api-project-detail/project-home/project-home.component';
import { ProjectDetailRouteGuard } from './components/designer/api-project-detail/api-project-detail-route-guard';
import { ProjectModelsComponent } from './components/designer/api-project-detail/project-models/project-models.component';
import { ProjectEndpointComponent } from './components/designer/api-project-detail/project-endpoint/project-endpoint.component';
import { ProjectTraitsComponent } from './components/designer/api-project-detail/project-traits/project-traits.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { TeamsComponent } from './components/dashboard/teams/teams.component';
import { DashboardHomeComponent } from './components/dashboard/dashboard-home/dashboard-home.component';
import { DashboardRouteGuard } from './components/dashboard/dashboard-route-guard';
import { TeamDetailsComponent } from './components/dashboard/teams/team-details/team-details.component';
import { PublishedDocsComponent } from './components/dashboard/published-docs/published-docs.component';
import { AccountComponent } from './components/dashboard/account/account.component';
import { PublishedDocsDetailComponent } from './components/dashboard/published-docs/published-docs-detail/published-docs-detail.component';
import { DocsDetailComponent } from './components/docs/docs-detail/docs-detail.component';
import { ApiBuilderComponent } from './components/designer/api-project-detail/api-builder/api-builder.component';
import LocalStore from './services/localStore';
import { ProjectExampleComponent } from './components/designer/api-project-detail/project-example/project-example.component';


const routes: Routes = [
  {
    path: '',
    redirectTo: LocalStore.get(LocalStore.WORKSPACE)?.toLowerCase() || 'designer', pathMatch: 'full'
  },
  {
    path: 'designer',
    component: DesignerComponent,
    data: {
      reuse: true
    }
  },
  {
    path: 'designer/:projectId',
    component: ApiProjectDetailComponent,
    data: {
      //TODO: Enable reuse for this. Current issue: Designer->ProjectDetail->Endpoints->Designer (skipping ProjectDetail)
      //Now opening any project errors as new route is designer/:id and last saved was designer/:id/endpoints
      reuse: false
    },
    children: [
      { path: '', component: ProjectHomeComponent, pathMatch: 'full' },
      { path: "folders/:folderId", component: ProjectFolderComponent, canDeactivate: [ProjectDetailRouteGuard] },
      { path: "models/:modelId", component: ProjectModelsComponent, canDeactivate: [ProjectDetailRouteGuard] },
      { path: "endpoints/:endpId", component: ProjectEndpointComponent, canDeactivate: [ProjectDetailRouteGuard] },
      { path: "traits/:traitId", component: ProjectTraitsComponent, canDeactivate: [ProjectDetailRouteGuard] },
      { path: "api-builder", component: ApiBuilderComponent, canDeactivate: [ProjectDetailRouteGuard] },
      { path: "examples/:exampleId", component: ProjectExampleComponent, canDeactivate: [ProjectDetailRouteGuard] },
    ]
  },
  {
    path: 'tester',
    component: TesterMainComponent,
    data: {
      reuse: true
    }
  },
  {
    path: 'docs',
    component: DocsComponent
  },
  {
    path: 'docs/:projectId',
    component: DocsDetailComponent,
    data: {
      reuse: true
    }
  },
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [DashboardRouteGuard],
    children: [
      { path: '', component: DashboardHomeComponent, pathMatch: 'full' },
      {
        path: "teams",
        component: TeamsComponent,
        children: [
          { path: ":teamId", component: TeamDetailsComponent }
        ]
      },
      {
        path: "puslishedDocs",
        component: PublishedDocsComponent,
        children: [
          { path: ":docId", component: PublishedDocsDetailComponent }
        ]
      },
      { path: "account", component: AccountComponent },
    ]
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { relativeLinkResolution: 'corrected', anchorScrolling: 'enabled', useHash: true })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
