import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'orderBy' })
export class OrderByPipe implements PipeTransform {

    transform(value: any[], column: string = '', order = '',): any[] {
        if (!value || value.length <= 1) { return value; }
        if (!order) order = 'asc'
        if (!column || column === '') {
            if (order === 'asc') { return value.sort() }
            else { return value.sort().reverse(); }
        }
        return value.sort((a, b) => {
            let aLC: string = a[column].toLowerCase();
            let bLC: string = b[column].toLowerCase();
            return aLC < bLC ? -1 : (aLC > bLC ? 1 : 0);
        });
    }
}