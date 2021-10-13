import { Entity } from '../entity.interface';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { JsonSchemaOption } from '../jsonschema.component';

@Component({
    // tslint:disable-next-line: component-selector
    selector: 'ng-jsonschema-main',
    templateUrl: './main.component.html',
    providers: []
})
//TODO: Use track by for all ngFor
export class MainJsonSchemaComponent implements OnInit {
    @Input()
    entity: Entity;

    @Input()
    options: JsonSchemaOption

    @Input()
    openMenu;

    @Input()
    refreshSchema;

    @Input()
    models;

    @Input()
    removeEntity;

    @Output()
    onAddNewProp = new EventEmitter();

    @Input()
    expand$ref: Function;

    @Input()
    buildTest: Function

    @Input()
    addAdditionalProp: Function;

    showDetailsPan = false;
    ctrl = {
        expanded: true
    };

    ngOnInit() {

    }

    addNewProp(event) {
        let outData;
        if (event instanceof MouseEvent) {
            outData = {
                entity: this.entity,
                event
            }
        } else {
            outData = event
        }
        this.onAddNewProp.emit(outData);
    }

    checkTypeObject(entity) {
        return entity._items && entity._items[0] && entity._items[0]._type[0] && entity._items[0]._type[0] === 'Object';
    }

    hasChild = ['Object', 'OneOf', 'AllOf', 'AnyOf']
    canAddChild(types, arrType) {
        return (this.hasChild.indexOf(types) >= 0 || types.some((v) => {
            return this.hasChild.indexOf(v) >= 0;
        }) || this.hasChild.indexOf(arrType) >= 0);
    }
}
