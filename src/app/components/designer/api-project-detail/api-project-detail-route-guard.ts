import { Injectable } from "@angular/core";
import { CanDeactivate } from "@angular/router";
import { ApiBuilderComponent } from "./api-builder/api-builder.component";
import { ProjectEndpointComponent } from "./project-endpoint/project-endpoint.component";
import { ProjectFolderComponent } from "./project-folder/project-folder.component";
import { ProjectModelsComponent } from "./project-models/project-models.component";
import { ProjectTraitsComponent } from "./project-traits/project-traits.component";

// @Injectable({ providedIn: 'root' })
export class ProjectDetailRouteGuard implements CanDeactivate<ProjectFolderComponent | ProjectModelsComponent | ProjectEndpointComponent | ProjectTraitsComponent> {

    canDeactivate(component: ProjectFolderComponent | ProjectModelsComponent | ProjectEndpointComponent | ProjectTraitsComponent | ApiBuilderComponent) {
        return component.canDeactivate();
    }
}