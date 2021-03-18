import { Toaster } from 'src/app/services/toaster.service';
import { Injectable } from '@angular/core';
import { throwError } from 'rxjs';

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
    constructor(private toaster: Toaster) { }

    handleHttpError(error, options?: ErrorhandlerOption) {
        console.log('error', error);
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
}