import { Entity } from './entity.interface';
import {
  Component,
  OnInit,
  Input,
  ViewEncapsulation,
  ViewChild,
  forwardRef,
  Output,
  EventEmitter,
} from '@angular/core';
import { JsonSchemaService } from './jsonschema.service';
import { Utils } from '../../../services/utils.service'
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface JsonSchemaOption {
  mode?: 'object' | 'list',
  disableManualAdd?: boolean,
  listModeMsg?: string,
  disabledKeys?: string[],
  showTestBuilder?: boolean
}

@Component({
  selector: 'ng-jsonschema',
  templateUrl: './jsonschema.component.html',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => JsonSchemaComponent),
      multi: true,
    },
  ],
  styleUrls: ['./jsonschema.component.scss'],
  encapsulation: ViewEncapsulation.None,
})

export class JsonSchemaComponent implements OnInit, ControlValueAccessor {
  private _defaultOption: JsonSchemaOption = {
    mode: 'object',
    disabledKeys: [],
    showTestBuilder: false
  }

  @ViewChild('editor') editor;

  @Input()
  options: JsonSchemaOption;

  @Input()
  schema: any = null;

  @Input()
  models: any = [];

  @Input()
  responses: any = [];

  @Output()
  onSchemaChange = new EventEmitter<number>();

  @Output()
  onTestBuilder = new EventEmitter<number>()

  propagateChange: any = () => { };
  propagateTouch: any = () => { };
  showSelectorModal: boolean = false;
  selectorModalPosition = {
    x: 0, y: 0
  };
  showAddModelForm = false;
  pendingEditorRefresh: boolean = false;

  configs: any = {
    showMoreOptn: '',
    currModelType: [],
    extraArrayOptn: '',
    menuOpen: true,
  };
  modelRef: string = '';
  readonly;
  entity;
  selectedEntity;
  JsonSchema = new JsonSchemaService();
  hasChild = ['Object', 'OneOf', 'AllOf', 'AnyOf'];
  singleChild = ['OneOf', 'AllOf', 'AnyOf'];
  schemaStr = { original: '', dup: '' };

  constructor(private utils: Utils) {

  }
  // ngAfterViewChecked(): void {}
  writeValue(value: any): void {
    if (value !== undefined) {
      this.schema = value;
      this.initRootElement(this.schema);
    }
  }
  registerOnChange(fn: any): void {
    this.propagateChange = fn;
  }
  registerOnTouched(fn: any): void {
    this.propagateTouch = fn;
  }
  setDisabledState?(isDisabled: boolean): void {
    alert('disable');
  }
  ngOnInit() {
    this.options = { ...this._defaultOption, ...this.options }

    if (!this.schema) {
      this.schema = {
        type: 'object',
      };
    }
    this.initRootElement(this.schema);
  }

  refreshSchema() {
    setTimeout(() => {
      this.schema = this.JsonSchema.obj2schema(this.entity, this.models);
      this.propagateChange(this.schema);
    });
  }

  str(data) {
    return JSON.stringify(
      data,
      function (k, v) {
        if (v === undefined) {
          return null;
        }
        return v;
      },
      '     '
    );
  }

  initRootElement(schema) {
    //  initialize the root
    if (schema) {
      this.entity = this.JsonSchema.schema2obj(
        schema,
        undefined,
        undefined,
        true,
        this.models,
        undefined
      );
      this.entity.root$$ = true;
      return;
    }
    this.entity = this.JsonSchema.newObject('##ROOT##', null, '$response');
    this.entity.root$$ = true;
  }

  //  generates a model based on the type and key
  generateModel(type, key) {
    var newModel;
    switch (type) {
      case 'Array':
        newModel = this.JsonSchema.newArray(key);
        break;
      case 'Boolean':
        newModel = this.JsonSchema.newBoolean(key);
        break;
      case 'Integer':
        newModel = this.JsonSchema.newInteger(key);
        break;
      case 'Number':
        newModel = this.JsonSchema.newNumber(key);
        break;
      case 'Null':
        newModel = this.JsonSchema.newNull(key);
        break;
      case 'Object':
        newModel = this.JsonSchema.newObject(key);
        break;
      case 'String':
        newModel = this.JsonSchema.newString(key);
        break;
      case '$ref':
        newModel = this.JsonSchema.new$ref(key);
        break;
      case 'OneOf':
      case 'AnyOf':
      case 'AllOf':
        newModel = this.JsonSchema.newXOf(type, key);
    }
    return newModel;
  }

  // recursively fine the parent and add the entity
  addNewProp($event) {
    let { entity, event } = $event
    var addTo = 'Object';
    if (entity._type.indexOf('Object') >= 0) {
      addTo = 'Object';
    } else if (this.singleChild.indexOf(entity._type[0]) >= 0) {
      //as oneOf,allOf,anyOf are single select, entity._type is array of 1
      addTo = 'XOf';
    } else if (
      entity._items[0] &&
      this.hasChild.indexOf(entity._items[0]._type[0]) >= 0
    ) {
      addTo = 'Array';
    }

    // this.$dirty = true;
    switch (addTo) {
      case 'Object':
        var apic = this.JsonSchema.newString(
          '',
          false,
          entity._parent + '.' + entity._key.replace('##ROOT##', 'data')
        );
        entity._properties.push(apic);
        break;
      case 'Array':
        this.addNewPropArrObj(entity, entity._items[0]._type[0], event);
        break;
      case 'XOf':
        var apic = this.JsonSchema.newString(
          '',
          false,
          entity._parent + '.' + entity._key.replace('##ROOT##', 'data')
        );
        apic._hideKey = true;
        entity._properties.push(apic);
        break;
    }
    setTimeout(() => {
      event.target.closest('.objCont').querySelector('.propCont:last-child .model-key')?.focus()
    });

    this.refreshSchema();
    this.emitSchemaChanged();
  }

  expand$ref(entity) {
    var obj;
    if (entity._value) {
      obj = entity;
    } else if (entity._items && entity._items[0]._value) {
      obj = entity._items[0];
    }
    if (!obj) return;
    if (!obj._refExp) {
      var model = this.models[obj._value] || (this.responses && this.responses.find(function (a) {
        return a.name === obj._value
      }));
      if (!model) return;
      var schema = model.data;
      var refData = this.JsonSchema.schema2obj(schema, '', undefined, true, this.models, obj._parent + (obj._key ? ('.' + obj._key) : '')); //obj._key is blank fro Array[$ref]
      refData.refTxt = 'Expanded $ref ' + model.name;
      refData.disabled = true;
      obj._refExp = refData;
    } else {
      delete obj._refExp;
    }
  }

  // Add property when array type is Object
  addNewPropArrObj(entity, addTo, e) {
    if (!entity._items) {
      return;
    }
    var apic = this.JsonSchema.newString(
      '',
      false,
      entity._parent + '.' + entity._key.replace('##ROOT##', 'data') + '[0]'
    );
    if (this.singleChild.indexOf(addTo) >= 0) {
      apic._hideKey = true;
    }
    entity._items[0]._properties.push(apic);
    this.emitSchemaChanged();
  }

  // callback after the model changed
  modelChangesCallback(entity, suppressEmmit = false) {
    this.configs.currModelType = entity._type;
    this.selectedEntity = entity;
    this.configs.extraArrayOptn = false;
    if (entity._type.indexOf('Array') >= 0) {
      this.configs.showMoreOptn = 'array';
      if (entity._items?.[0]?._type?.indexOf('$ref') >= 0) {
        this.configs.extraArrayOptn = true;
        this.modelRef = '';
      }
    } else if (entity._type.indexOf('$ref') >= 0) {
      this.configs.showMoreOptn = '$ref';
      this.modelRef = '';
    } else {
      this.configs.showMoreOptn = '';
    }
    if (!suppressEmmit) {
      this.emitSchemaChanged();
    }
  }

  setArrayType(type, entity, e) {
    var newM = this.generateModel(type, 'arrayEle');
    entity = this.selectedEntity;
    entity._items[0] = newM;
    if (type === '$ref') {
      this.configs.extraArrayOptn = true;
      this.modelRef = '';
    } else {
      this.configs.extraArrayOptn = false;
    }
    e.stopPropagation();
    this.refreshSchema();
  }

  //Defined in selectschema.component
  // setModelFor$Ref() {
  //     if (this.configs.extraArrayOptn) {
  //         this.selectedEntity._items[0]._value = this.modelRef.model;
  //     } else {
  //         this.selectedEntity._value = this.modelRef.model;
  //     }
  // }

  removeEntity(entity) {
    const res = this.removeModel(this.entity, entity.__ID__);
    if (res !== undefined) {
      // this.data._properties.splice(res, 1);
      this.entity._properties.splice(res, 1);
    }
    this.refreshSchema();
    this.emitSchemaChanged();
  }

  removeModel(data, id, i = null) {
    // this.$dirty = true;
    if (data.__ID__ === id) return i;
    var res;
    for (var j = 0; j < data._type.length; j++) {
      var type = data._type[j];
      switch (type) {
        case 'Object':
        case 'OneOf':
        case 'AnyOf':
        case 'AllOf':
          for (var j = 0; j < data._properties.length; j++) {
            var val = data._properties[j];
            res = this.removeModel(val, id, j);
            if (res !== undefined) {
              data._properties.splice(j, 1);
            }
          }
          if (type === 'Object') {
            for (var j = 0; j < data._additionalProperties.length; j++) {
              var val = data._additionalProperties[j];
              res = this.removeModel(val, id, j);
              if (res !== undefined) {
                data._additionalProperties.splice(j, 1);
                break;
              }
            }
          }
          break;
        case 'Array':
          if (data._items[0] && data._items[0]._properties) {
            for (var k = 0; k < data._items[0]._properties.length; k++) {
              var val = data._items[0]._properties[k];
              res = this.removeModel(val, id, k);
              if (res !== undefined) {
                data._items[0]._properties.splice(k, 1);
              }
            }
          }
          break;
      }
    }
  }

  buildTest(entity, $event) {
    this.onTestBuilder.next({ ...entity, top: $event.clientY })
  }

  convertObj2Schema() {
    const schema = this.JsonSchema.obj2schema(this.entity, this.models);
    this.schemaStr.original = JSON.stringify(schema, null, '    ');
    this.schemaStr.dup = this.schemaStr.original;
    this.pendingEditorRefresh = true;
  }

  convertEditorSchema2Obj() {
    if (this.editor && this.schemaStr.original != this.schemaStr.dup) {
      this.entity = this.JsonSchema.schema2obj(
        JSON.parse(this.schemaStr.original),
        undefined,
        undefined,
        true,
        this.models,
        undefined
      );
      this.refreshSchema();
      this.emitSchemaChanged()
    }
  }

  displaySelectorModal(entity = null, e: MouseEvent = null) {
    if (entity) {
      this.modelChangesCallback(entity, true);
    }

    if (e) {
      e.preventDefault();
      e.stopPropagation();
      var winHeight = window.innerHeight;
      var left = e.clientX, bottom = winHeight - e.clientY;
      // var popHeight = 200; //max height of the popup
      // if (winHeight - top < popHeight) {
      //   top = winHeight - popHeight;
      // }
      this.selectorModalPosition = { x: left, y: bottom };
    }

    document.addEventListener('click', this.clickHandler, false);
    //using state causes selector modal to open schema builders for all in the page as the state service is shared among all
    // this.state.setSelectorModel(true);
    this.showSelectorModal = true;
  }

  clickHandler = () => {
    // this.state.setSelectorModel(false);
    this.showSelectorModal = false;
    document.removeEventListener('click', this.clickHandler, false);
  }

  addAdditionalProp(entity: Entity) {
    var additionalProperties = this.JsonSchema.newString('additionalProperties', false, entity._parent + '.' + entity._key.replace('##ROOT##', 'data'));
    additionalProperties._readOnlyKey = true;
    additionalProperties._hideKey = true;
    if (!entity._additionalProperties) {
      entity._additionalProperties = []
    }
    entity._additionalProperties.push(additionalProperties);
    entity._disallowAdditional = false;
  }

  downloadJSON() {
    const filename = 'schema.json';
    const text = this.str(this.schemaStr.original);
    this.download(filename, text);
  }

  download(filename, text) {
    const element = document.createElement('a');
    element.setAttribute(
      'href',
      'data:text/plain;charset=utf-8,' + encodeURIComponent(text)
    );
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }

  emitSchemaChanged() {
    this.onSchemaChange.emit();
  }

  tabChange(event) {
    switch (event.index) {
      case 0:
        this.convertEditorSchema2Obj();
        break;
      case 1:
        this.convertObj2Schema();
        break;
    }
  }

  copyToClipboard() {
    const text = JSON.stringify(this.JsonSchema.obj2schema(this.entity, this.models));
    this.utils.copyToClipboard(text);
  }
}
