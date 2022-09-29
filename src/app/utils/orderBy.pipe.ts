import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'orderBy' })
export class OrderByPipe implements PipeTransform {

    transform(items: any[], column: string = '', order = '', excludeValues = []): any[] {
        if (!items || items.length <= 1) { return items; }
        if (!order) order = 'asc'
        if (!column || column == '') {
            if (order === 'asc') { return items.sort() }
            else { return items.sort().reverse(); }
        }

        return order == 'asc' ?
            this.sortAscending(items, column, typeof items[0][column], excludeValues) :
            this.sortDescending(items, column, typeof items[0][column], excludeValues)
    }

    sortAscending(items, column, type, excludeValues: string[]) {
        return [...items.sort(function (a: any, b: any) {
            if (type === 'string') {
                if (excludeValues.includes(a[column])) return 1
                if (a[column].toUpperCase() < b[column].toUpperCase() || excludeValues.includes(b[column])) return -1;
            } else {
                return a[column] - b[column];
            }
        })]
    }

    sortDescending(items, column, type, excludeValues: string[]) {
        return [...items.sort(function (a: any, b: any) {
            if (type === 'string') {
                if (excludeValues.includes(a[column])) return 1;
                if (a[column].toUpperCase() > b[column].toUpperCase()) return -1;
            } else {
                return b[column] - a[column];
            }
        })]
    }
}