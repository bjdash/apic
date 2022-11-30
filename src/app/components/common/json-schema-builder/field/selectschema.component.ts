import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Entity } from '../entity.interface';
import { JsonSchemaOption } from '../jsonschema.component';
import { JsonSchemaService } from '../jsonschema.service';

export interface JsonSchemaSetArrayTypeEvent {
    type: SchemaArrayType,
    entity: Entity
}
export type SchemaArrayType = 'Unspecified' | 'Integer' | 'Boolean' | 'Number' | 'Object' | 'String' | '$ref';

@Component({
    // tslint:disable-next-line: component-selector
    selector: 'ng-jsonschema-selectschema',
    templateUrl: './selectschema.component.html',
    providers: []
})
export class SelectSchemaJsonSchemaComponent {
    @Input()
    configs;

    @Input()
    modelRef;

    @Output()
    onModelChange = new EventEmitter<Entity>();

    @Output()
    onSchemaUpdate = new EventEmitter()

    @Input()
    selectedEntity;

    @Output()
    onArrayTypeSet = new EventEmitter<JsonSchemaSetArrayTypeEvent>()

    @Input()
    options: JsonSchemaOption;

    @Input()
    models; //#/definitions

    @Input()
    responses;//#/responses

    @Input()
    entity

    JsonSchema = new JsonSchemaService();

    // change the model type
    changeModelType(type, entity, event) {
        entity = this.selectedEntity;
        if (event.ctrlKey) {
            if (entity._type.indexOf(type) >= 0) {
                // unselect current type
                if (entity._type.length > 1) {
                    const index = entity._type.indexOf(type);
                    entity._type.splice(index, 1);
                    this.manageModelProps(type, entity, 'remove');
                }
            } else {
                entity._type.push(type);
                this.manageModelProps(type, entity, 'add');
            }
        } else {
            for (let i = 0; i < entity._type.length; i++) {
                this.manageModelProps(entity._type[i], entity, 'remove');
            }
            entity._type = [type];
            this.manageModelProps(type, entity, 'add');
        }

        this.onModelChange.next(entity);
        if (event) {
            event.stopPropagation();
        }
        this.onSchemaUpdate.next()
    };

    manageModelProps(type, entity, action) {
        let fieldsObj = {};
        fieldsObj = this.JsonSchema.ENTITY_PROPS['for' + type];
        for (const key in fieldsObj) {
            if (!key) {
                continue;
            }
            const val = fieldsObj[key];
            if (action === 'remove') {
                if (entity.hasOwnProperty(key) && key !== '_type') {
                    delete entity[key];
                }
            } else if (action === 'add') {
                if (!entity.hasOwnProperty(key)) {
                    entity[key] = val;
                }
            }
        };
    }

    keys(obj) {
        return Object.keys(obj);
    }

    setModelFor$Ref() {
        var selectedEntity = this.configs.extraArrayOptn ? this.selectedEntity._items[0] : this.selectedEntity;
        var resPath = '#/responses/'
        if (this.modelRef.indexOf(resPath) === 0) {
            selectedEntity._path = resPath;
            selectedEntity._value = this.modelRef.substring(resPath.length);
        } else {
            selectedEntity._path = '#/definitions/';
            selectedEntity._value = this.modelRef;
        }
        this.onSchemaUpdate.next();
    }

    setArrayType(type: SchemaArrayType, entity: Entity, event) {
        event.stopPropagation();
        this.onArrayTypeSet.next({ type, entity })
    }

    stopPropagation(e: MouseEvent) {
        e.stopPropagation();
    }
}
