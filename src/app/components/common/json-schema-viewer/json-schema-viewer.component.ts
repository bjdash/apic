import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'json-schema-viewer',
  templateUrl: './json-schema-viewer.component.html',
  styleUrls: ['./json-schema-viewer.component.scss']
})
export class JsonSchemaViewerComponent implements OnInit {
  @Input() schema: any;
  @Input() open: number;

  isArray = false;
  isCollapsed = false;
  isPrimitive = false;

  constructor() {
  }

  ngOnInit(): void {
    this.initialize();
  }

  initialize() {
    this.isCollapsed = this.open < 0;

    this.addPropertyName(this.schema);
    this.isArray = this.schema && this.schema.type === 'array';

    // Determine if a schema is a primitive
    this.isPrimitive = this.schema &&
      !this.schema.properties &&
      !this.schema.items &&
      this.schema.type !== 'array' &&
      this.schema.type !== 'object';
  }

  convertXOf(type) {
    return type.substring(0, 3) + ' of';
  };

  addPropertyName(schema) {
    if (!schema) {
      return;
    }
    if (this.isObject(schema.items)) {
      this.addPropertyName(schema.items);
    }
    else if (this.isObject(schema.properties)) {
      Object.keys(schema.properties).forEach((propertyName) => {
        // schema.properties[propertyName].name = propertyName;
        this.addPropertyName(schema.properties[propertyName]);
      });
    }
  }

  isObject(a) {
    return null !== a && "object" === typeof a
  }

  toggle = function () {
    this.isCollapsed = !this.isCollapsed;
  };

  isPrimitiveCollapsible = function () {
    return this.schema.description ||
      this.schema.title;
  };
}
