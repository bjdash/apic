import { ActivatedRouteSnapshot, DetachedRouteHandle, RouteReuseStrategy } from "@angular/router";

export class ApicRouteReuseStrategy implements RouteReuseStrategy {
    private storedRoutes = new Map<string, { url: string, route: DetachedRouteHandle }>();

    shouldDetach(route: ActivatedRouteSnapshot): boolean {
        return route.routeConfig.path === 'tester' || route.routeConfig.path.startsWith('designer') || route.routeConfig.path === 'dashboard';
    }

    store(route: ActivatedRouteSnapshot, handle: DetachedRouteHandle): void {
        this.storedRoutes.set(this.getModule(route), { route: handle, url: this.getResolvedUrl(route) });
        // if (handle) {
        // }
    }

    shouldAttach(route: ActivatedRouteSnapshot): boolean {
        let savedRoute = this.storedRoutes.get(this.getModule(route));
        return !!savedRoute && savedRoute.url === this.getResolvedUrl(route);
    }

    retrieve(route: ActivatedRouteSnapshot): DetachedRouteHandle {
        let savedRoute = this.storedRoutes.get(this.getModule(route));
        return savedRoute?.url === this.getResolvedUrl(route) ? savedRoute.route : undefined;
    }

    shouldReuseRoute(future: ActivatedRouteSnapshot, curr: ActivatedRouteSnapshot): boolean {
        return future.routeConfig === curr.routeConfig;
    }

    getResolvedUrl(route: ActivatedRouteSnapshot): string {
        return route.pathFromRoot
            .map(v => v.url.map(segment => segment.toString()).join('/'))
            .join('/');
    }

    getModule(route: ActivatedRouteSnapshot) {
        let urlParts = route.routeConfig?.path.split('/');
        return urlParts[0];
    }
}