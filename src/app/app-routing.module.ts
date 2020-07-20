import { ProjectFolderComponent } from './api-project-detail/project-folder/project-folder.component';
import { ProjectHomeComponent } from './api-project-detail/project-home/project-home.component';
import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { DesignerComponent } from './designer/designer.component';
import { DocsComponent } from './docs/docs.component';
import { ApiProjectDetailComponent } from './api-project-detail/api-project-detail.component';


const routes: Routes = [
  { path: '', redirectTo: 'designer', pathMatch: 'full' },
  { path: 'designer', component: DesignerComponent },
  {
    path: 'designer/:projectId',
    component: ApiProjectDetailComponent,
    // children: [
    //   { path: "", component: ProjectHomeComponent },
    //   { path: "folders/:id", component: ProjectFolderComponent },
    // ]
  },
  { path: 'docs', component: DocsComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
