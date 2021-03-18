import { Entity } from './../entity.interface';
import { Component, Input } from '@angular/core';

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

    removeAdditionalProp(entity: Entity) {
        entity._additionalProperties = [];
    }
}
