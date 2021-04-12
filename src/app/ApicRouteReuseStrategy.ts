import { ActivatedRouteSnapshot, DetachedRouteHandle, RouteReuseStrategy } from "@angular/router";

export class ApicRouteReuseStrategy implements RouteReuseStrategy {
    private handlers: { [key: string]: DetachedRouteHandle } = {};

    shouldDetach(route: ActivatedRouteSnapshot): boolean {
        if (!route.routeConfig || route.routeConfig.loadChildren) {
            return false;
        }

        if (route.routeConfig.data) {
            return route.routeConfig.data.sticky;
        }
        return false;
    }

    store(route: ActivatedRouteSnapshot, handle: DetachedRouteHandle): void {
        if (handle) {
            this.handlers[this.getUrl(route)] = handle;
        }
    }

    shouldAttach(route: ActivatedRouteSnapshot): boolean {
        return !!this.handlers[this.getUrl(route)];
    }

    retrieve(route: ActivatedRouteSnapshot): DetachedRouteHandle {
        if (!route.routeConfig || route.routeConfig.loadChildren) {
            return null;
        };

        return this.handlers[this.getUrl(route)];
    }

    shouldReuseRoute(future: ActivatedRouteSnapshot, curr: ActivatedRouteSnapshot): boolean {
        let reuse = future.routeConfig?.data?.sticky ? true : false;
        return reuse || (future.routeConfig === curr.routeConfig);
    }

    getUrl(route: ActivatedRouteSnapshot): string {
        /** The url we are going to return */
        if (route.routeConfig) {
            const url = route.routeConfig.path;
            console.log('[router-reuse] returning url', url);

            return url;
        }
    }
}