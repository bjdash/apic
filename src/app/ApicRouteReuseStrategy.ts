import { Injectable } from "@angular/core";
import { ActivatedRouteSnapshot, DetachedRouteHandle, RouteReuseStrategy } from "@angular/router";
import { DetachedRouteHandlerService } from "./detached-route-handler.service";

@Injectable()
export class ApicRouteReuseStrategy implements RouteReuseStrategy {
    constructor(
        private detachedRouteHandlesService: DetachedRouteHandlerService
    ) { }

    public shouldDetach(route: ActivatedRouteSnapshot): boolean {
        return !!route.data.reuse;
    }

    public store(
        route: ActivatedRouteSnapshot,
        detachedRouteHandle: DetachedRouteHandle
    ): void {
        detachedRouteHandle
            ? this.detachedRouteHandlesService.set(
                route.component,
                detachedRouteHandle
            )
            : this.detachedRouteHandlesService.delete(route.component);
    }

    public shouldAttach(route: ActivatedRouteSnapshot): boolean {
        return !!route.data.reuse
            ? this.detachedRouteHandlesService.has(route.component)
            : false;
    }

    public retrieve(route: ActivatedRouteSnapshot): DetachedRouteHandle | null {
        return !!route.data.reuse
            ? this.detachedRouteHandlesService.get(route.component)
            : null;
    }

    public shouldReuseRoute(
        future: ActivatedRouteSnapshot,
        curr: ActivatedRouteSnapshot
    ): boolean {
        return future.routeConfig === curr.routeConfig;
    }
}
// @Injectable()
// export class ApicRouteReuseStrategy implements RouteReuseStrategy {
//     private storedRoutes = new Map<string, { url: string, route: DetachedRouteHandle }>();
//     constructor(private detachedRouteHandlesService: DetachedRouteHandlerService) {
//         window['test'] = setInterval(() => {
//             console.log(this.storedRoutes);
//         }, 5000)
//     }
//     // https://www.auroria.io/angular-route-reuse-strategy/


//     // shouldDetach : Asks if the snapshot should be detached from the router. That means that the router will no longer handle this snapshot after it has been stored by calling the store-method.
//     // store : After the router has asked by using the shouldDetach-method and it returned true, the store-method is called (not immediately but some time later). If the router sends you a null-value, you can delete this entry from your storage. No need to take care about the memory. Angular should handle this.
//     // shouldAttach : Asks if a snapshot for the current route already has been stored. Return true, if your storage contains the right snapshot and the router should re-attach this snapshot to the routing.
//     // retrieve : load the snapshot from your storage. It's only called, if the shouldAttach-method returned true.
//     // shouldReuseRoute : Asks if a snapshot from the current routing can be used for the future routing.

//     //shouldDetach() should return false instead of true to have a routing component be destroyed.
//     //Determines if this route (and its subtree) should be detached to be reused later
//     shouldDetach(route: ActivatedRouteSnapshot): boolean {
//         console.log('shouldDetach', route.routeConfig.path === 'tester' || route.routeConfig.path.startsWith('designer') || route.routeConfig.path === 'dashboard')
//         return route.routeConfig.path === 'tester' || route.routeConfig.path.startsWith('designer') || route.routeConfig.path === 'dashboard';
//     }

//     store(route: ActivatedRouteSnapshot, handle: DetachedRouteHandle): void {
//         console.log('storing', this.getModule(route), route.routeConfig.path, route.component);

//         this.storedRoutes.set(this.getModule(route), { route: handle, url: this.getResolvedUrl(route) });
//         handle
//             ? this.detachedRouteHandlesService.set(route.component, handle)
//             : this.detachedRouteHandlesService.delete(route.component);
//     }

//     //Determines if this route (and its subtree) should be reattached
//     shouldAttach(route: ActivatedRouteSnapshot): boolean {
//         let savedRoute = this.storedRoutes.get(this.getModule(route));
//         console.log('shouldAttach', !!savedRoute)
//         return !!savedRoute;
//     }

//     retrieve(route: ActivatedRouteSnapshot): DetachedRouteHandle {
//         let savedRoute = this.storedRoutes.get(this.getModule(route));

//         let returning: any = (savedRoute?.url === this.getResolvedUrl(route) ? savedRoute.route : undefined)
//         console.log('retrieve', returning?.componentRef?.componentType, route.routeConfig?.path);

//         return savedRoute?.route;;// === this.getResolvedUrl(route) ? savedRoute.route : undefined;
//     }

//     shouldReuseRoute(future: ActivatedRouteSnapshot, curr: ActivatedRouteSnapshot): boolean {
//         console.log('shouldReuseRoute', future.routeConfig, curr.routeConfig);
//         return false;//future.routeConfig === curr.routeConfig;
//     }

//     getResolvedUrl(route: ActivatedRouteSnapshot): string {
//         return route.pathFromRoot
//             .map(v => v.url.map(segment => segment.toString()).join('/'))
//             .join('/');
//     }

//     getModule(route: ActivatedRouteSnapshot) {
//         return route.routeConfig?.path;
//         let urlParts = route.routeConfig?.path.split('/');
//         return urlParts[0];
//     }
// }