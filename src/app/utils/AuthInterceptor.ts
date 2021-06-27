import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { AuthService } from '../services/auth.service';

@Injectable({
    providedIn: 'root',
})
export class AuthInterceptor implements HttpInterceptor {
    urlPattern: string;
    constructor(private authService: AuthService) {
        this.urlPattern = `${environment.host}api/user/`;
    }
    intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        if (request.url.startsWith(this.urlPattern)) {
            console.log('intercwp', request)
            // add authorization header with basic auth credentials if available
            let authHeader = this.authService.getAuthHeader();
            request = request.clone({
                setHeaders: {
                    Authorization: authHeader
                }
            });
        }
        return next.handle(request);
    }
}