import { Injectable, Pipe, PipeTransform } from "@angular/core";

@Pipe({
    name: 'filter'
})
@Injectable()
export class CustomFilter implements PipeTransform {
    transform(items: any[], filterStr: string, propertiesToFilter?: string[]): any {
        if (!propertiesToFilter || propertiesToFilter.length < 1) {
            propertiesToFilter = ['name']
        }
        return items.filter(item => {
            return propertiesToFilter.map(prop => {
                return item[prop].toLowerCase().includes(filterStr.toLowerCase())
            }).includes(true)
        })
    }
}