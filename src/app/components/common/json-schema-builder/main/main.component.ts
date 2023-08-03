import { Entity } from '../entity.interface';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { JsonSchemaOption } from '../jsonschema.component';

export interface SchemaClickOpenEvent {
    entity: Entity,
    clientY?: number
    clientX?: number
}
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

    @Output()
    onMenuOpen = new EventEmitter<SchemaClickOpenEvent>();

    @Input()
    models;

    @Output()
    onEntityRemove = new EventEmitter<Entity>();

    @Output()
    onSchemaUpdate = new EventEmitter();

    @Output()
    onAddNewProp = new EventEmitter();

    @Output()
    on$refExpand = new EventEmitter<Entity>();

    @Output()
    onBuildTest = new EventEmitter<SchemaClickOpenEvent>()

    @Output()
    onAdditionalPropAdd = new EventEmitter<Entity>();

    showDetailsPan = false;
    ctrl = {
        expanded: true
    };

    ngOnInit() {

    }

    refreshSchema() {
        this.onSchemaUpdate.next();
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

    addAdditionalProp(entity: Entity) {
        this.onAdditionalPropAdd.next(entity);
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

    buildTest(event: SchemaClickOpenEvent) {
        this.onBuildTest.next(event)
    }

    openMenu(event: SchemaClickOpenEvent) {
        this.onMenuOpen.next(event);
    }

    removeEntity(entity: Entity) {
        this.onEntityRemove.next(entity)
    }

    expand$ref(entity: Entity) {
        this.on$refExpand.next(entity)
    }
}
