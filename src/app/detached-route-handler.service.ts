import { Injectable } from '@angular/core';
import { DetachedRouteHandle } from '@angular/router';
import { Observable, Subject } from 'rxjs';

export interface RouteChange {
  for: any,
  store: Map<any, any>
}
@Injectable({
  providedIn: 'root'
})
export class DetachedRouteHandlerService {
  store: Map<any, any>;
  changes: Subject<RouteChange>
  changes$: Observable<RouteChange>;

  constructor() {
    this.store = new Map();

    this.changes = new Subject();
    this.changes$ = this.changes.asObservable();
  }

  private next(component: any): void {
    this.changes.next({ for: component, store: this.store });
  }

  public set(component: any, handle: DetachedRouteHandle): void {
    this.store.set(component, handle);
    this.next(component);
  }

  public delete(component: any): void {
    this.store.delete(component);
    this.next(component);
  }

  public get(component: any): DetachedRouteHandle | null {
    return this.store.get(component);
  }

  public has(component: any): boolean {
    return this.store.has(component);
  }

  public clear(): void {
    this.store.clear();
    this.next(null);
  }
}
