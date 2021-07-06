import { Entity } from '../entity.interface';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
    // tslint:disable-next-line: component-selector
    selector: 'ng-jsonschema-field',
    templateUrl: './field.component.html',
    providers: []
})
export class FieldJsonSchemaComponent {
    @Input()
    type;

    @Input()
    openMenu;

    @Input()
    entity: Entity = {};

    @Input()
    addAdditionalProp: Function;

    @Output() onChange = new EventEmitter()

    removeAdditionalProp(entity: Entity) {
        entity._additionalProperties = [];
    }

    onChanged() {
        this.onChange.next();
    }
}
