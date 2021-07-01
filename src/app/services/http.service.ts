import { Toaster } from 'src/app/services/toaster.service';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { ApicUrls } from '../utils/constants';
import { catchError, map } from 'rxjs/operators';

export interface ErrorhandlerOption {
    messagePrefix?: string,
    supressNotification?: boolean,
    throwActualError?: boolean
}

@Injectable()
export class HttpService {
    defaultErrorHandlerOption: ErrorhandlerOption = {
        messagePrefix: '',
        supressNotification: false,
        throwActualError: false
    }
    constructor(private toaster: Toaster, private http: HttpClient) { }

    handleHttpError(error, options?: ErrorhandlerOption) {
        console.error('error', error);
        options = { ...this.defaultErrorHandlerOption, ...options };
        let errorMessage = options.messagePrefix ? `${options.messagePrefix} ` : '';
        if (error.error instanceof ErrorEvent) {
            // client-side error
            errorMessage += error.error.message;
        } else {
            // server-side error
            errorMessage += error?.error?.desc ? error.error.desc : error.message
        }
        if (!options.supressNotification) {
            this.toaster.error(errorMessage)
        }
        if (options.throwActualError) {
            return throwError(error);
        }
        return throwError(errorMessage);
    }
    processResponse(response: any) {
        if (response?.status === 'ok') {
            return response.resp;
        } else {
            throw new Error(response?.desc || 'Unknown error');
        }
    }
    getNotifications(): Observable<any[]> {
        return this.http.get(ApicUrls.notifications)
            .pipe(map((response: any) => {
                if (response?.status === 'ok') {
                    return response.resp;
                } else {
                    throw new Error(response?.desc || 'Unknown error');
                }

            }), catchError((error) => {
                return this.handleHttpError(error, { messagePrefix: 'Failed to get notifications.' });
            }))
    }
    getDashboard(): Observable<any> {
        return this.http.get(ApicUrls.dashboard)
            .pipe(map(this.processResponse), catchError((error) => {
                return this.handleHttpError(error, { messagePrefix: 'Failed to get dashboard details.' });
            }))
    }
}