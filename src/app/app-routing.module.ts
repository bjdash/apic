import { NgModule } from '@angular/core';
import { Routes, RouterModule, RouteReuseStrategy } from '@angular/router';
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


const routes: Routes = [
  {
    path: '',
    redirectTo: 'home', pathMatch: 'full'
  },
  {
    path: 'designer',
    component: DesignerComponent
  },
  {
    path: 'home',
    component: TesterMainComponent,
    data: {
      sticky: true
    }
  },
  {
    path: 'designer/:projectId',
    component: ApiProjectDetailComponent,
    children: [
      { path: '', component: ProjectHomeComponent, pathMatch: 'full' },
      { path: "folders/:folderId", component: ProjectFolderComponent, canDeactivate: [ProjectDetailRouteGuard] },
      { path: "models/:modelId", component: ProjectModelsComponent, canDeactivate: [ProjectDetailRouteGuard] },
      { path: "endpoints/:endpId", component: ProjectEndpointComponent, canDeactivate: [ProjectDetailRouteGuard] },
      { path: "traits/:traitId", component: ProjectTraitsComponent, canDeactivate: [ProjectDetailRouteGuard] },
      // { path: "api-builder", component: , canDeactivate: [] },
    ]
  },
  {
    path: 'docs',
    component: DocsComponent
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { relativeLinkResolution: 'corrected' })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
