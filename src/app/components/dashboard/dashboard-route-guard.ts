import { Injectable } from "@angular/core";
import { ActivatedRouteSnapshot, CanActivate, RouterStateSnapshot, UrlTree } from "@angular/router";
import { Observable } from "rxjs";
import { AuthService } from "src/app/services/auth.service";
import { Toaster } from "src/app/services/toaster.service";

@Injectable()
export class DashboardRouteGuard implements CanActivate {
    constructor(private toaster: Toaster, private authService: AuthService) { }

    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree | Observable<boolean | UrlTree> | Promise<boolean | UrlTree> {
        if (!this.authService.isLoggedIn()) {
            this.toaster.error('You need to be logged in to APIC to use this feature');
            return false;
        }
        return true;
    }

}