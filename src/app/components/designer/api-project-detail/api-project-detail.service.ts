import { Injectable } from "@angular/core";
import { BehaviorSubject, Subject } from "rxjs";
import { ApiProject } from "src/app/models/ApiProject.model";

@Injectable()
export class ApiProjectDetailService {
    private _onExportProj = new Subject<any>();
    onExportProj$ = this._onExportProj.asObservable();
    exportProj(type, id) {
        this._onExportProj.next([type, id]);
    }

    onSelectedProj$ = new BehaviorSubject<ApiProject>(null);
    selectProj(proj: ApiProject) {
        this.onSelectedProj$.next(proj);
    }
}