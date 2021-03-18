import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';

//TODO: This state service is not required as we dont want to share data between multiple schema builders in the same page
@Injectable()
export class StateService {

    private initialState = { showSelectorModal: false };
    private stateTracker = new BehaviorSubject<any>(this.initialState);

    constructor() { }
    /** Allows subscription to the behavior subject as an observable */
    getState(): Observable<any> {
        return this.stateTracker.asObservable();
    }

    /**
     * Allows updating the current value of the behavior subject
     * @param val a number representing the current value
     * @param delta a number representing the positive or negative change in current value
     */
    setSelectorModel(sel): void {
        this.stateTracker.next({ showSelectorModal: sel });
    }

    /** Resets the count to the initial value */
    resetState(): void {
        this.stateTracker.next(this.initialState);
    }
}