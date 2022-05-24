import { Injectable } from "@angular/core";
import { Subject } from "rxjs";
import { ApiProject } from "../models/ApiProject.model";

@Injectable({
    providedIn: 'root'
})
export class DataChangeNotifier {
    //TODO: Do for others
    readonly apiProjects = {
        onAdd$: new Subject<ApiProject[]>()
    }
}