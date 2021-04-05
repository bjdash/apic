import { Toaster } from './toaster.service';
import { Injectable } from "@angular/core";


@Injectable()
export default class Utils {
    constructor(private toaster: Toaster) {

    }

    copyToClipboard(text: string) {
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

    static arrayToObj<T>(array: T[], key: string): { [key: string]: T } {
        return array.reduce((obj, item: T) => Object.assign(obj, { [item[key]]: item }), {});
    }

    static objectEntries(obj): [string, any][] {
        return obj ? (Object.entries(obj) as [string, any][]) : [];
    }

    static objectKeys(obj): string[] {
        return obj ? Object.keys(obj) : [];
    }

    static assertBuilder(a, b, type, not) {
        //type = eql, gt, gte, lt, lte, a (to.be.a('string')),include
        var be = ['eql', 'gt', 'gte', 'lt', 'lte', 'a', 'an'];
        if (!type) type = 'eql';
        return 'expect(' + a + ')' + (not ? '.not' : '') + '.to' + (be.indexOf(type) > -1 ? '.be' : '') + '.' + type + '(' + b + ')';
    }
}
