import { Toaster } from './toaster.service';
import { Injectable } from "@angular/core";


@Injectable()
export default class Utils {
    constructor(private toaster: Toaster) {

    }

    copyToClipboard(text) {
        var input = document.createElement('textarea');
        input.style.position = 'fixed';
        input.style.opacity = '0';
        input.value = text;
        document.body.appendChild(input);
        input.select();
        document.execCommand('Copy');
        document.body.removeChild(input);
        this.toaster.success('Copied');
    }
}
