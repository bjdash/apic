import { NgModule } from '@angular/core';
import { Routes, RouterModule, RouteReuseStrategy } from '@angular/router';
import { DesignerComponent } from './components/designer/designer.component';
import { DocsComponent } from './components/docs/docs.component';
import { ApiProjectDetailComponent } from './components/designer/api-project-detail/api-project-detail.component';
import { TesterMainComponent } from './components/tester/tester-main.component';


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
    // children: [
    //   { path: "", component: ProjectHomeComponent },
    //   { path: "folders/:id", component: ProjectFolderComponent },
    // ]
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
