import { Injectable } from "@angular/core";
import { CanDeactivate } from "@angular/router";
import { ProjectFolderComponent } from "./project-folder/project-folder.component";
import { ProjectModelsComponent } from "./project-models/project-models.component";

// @Injectable({ providedIn: 'root' })
export class ProjectDetailRouteGuard implements CanDeactivate<ProjectFolderComponent | ProjectModelsComponent> {

    canDeactivate(component: ProjectFolderComponent | ProjectModelsComponent) {
        return component.canDeactivate();
    }
}