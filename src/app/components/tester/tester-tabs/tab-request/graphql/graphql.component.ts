import { HttpClient } from '@angular/common/http';
import { Component, EventEmitter, forwardRef, Input, OnInit, Output, ViewChild } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { AceEditorComponent } from 'ng2-ace-editor';
import * as ace from 'brace';
import { environment } from 'src/environments/environment';
import { ApicAgentService } from 'src/app/services/apic-agent.service';

@Component({
  selector: 'app-graphql',
  templateUrl: './graphql.component.html',
  styleUrls: ['./graphql.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => GraphqlComponent),
      multi: true,
    },
  ],
})
export class GraphqlComponent implements OnInit, ControlValueAccessor {
  @Input() url: string;
  @Input() method: string;
  @Input() gqlVars: string;
  @Output() onGqlVarsChange = new EventEmitter();
  @ViewChild('gqlAce') ace: AceEditorComponent;

  gqlTypes: any;
  gqlSuggests: any;
  gqlPath = ['Root'];
  platform = environment.PLATFORM;
  private propagateChange = (_: any) => { };
  private propagateTouch = () => { };
  text: string;

  flags = {
    gqlTab: 'schema',
    loading: false
  }
  options = {
    enableBasicAutocompletion: true,
    enableLiveAutocompletion: true
  };

  constructor(private httpClient: HttpClient, private apicAgentService: ApicAgentService) { }

  writeValue(obj: any): void {
    this.text = obj;
  }
  registerOnChange(fn: any): void {
    this.propagateChange = fn;
  }
  registerOnTouched(fn: any): void {
    this.propagateTouch = fn;
  }
  setDisabledState?(isDisabled: boolean): void {
    //TODO:
  }

  ngOnInit(): void {
    this.init()
  }

  async init() {
    try {
      this.flags.loading = true;
      let types = await this.loadSchema(this.url, this.method);
      this.gqlSuggests = types.suggests;
      delete types.suggests;
      this.gqlTypes = types;
      const langTools = ace.acequire('ace/ext/language_tools');
      langTools.setCompleters([{
        getCompletions: (editor, session, pos, prefix, callback) => {
          callback(null, this.gqlSuggests);
        }
      }]);
      this.flags.loading = false;
    } catch (e) {
      this.gqlTypes = null;
      this.flags.loading = false;
    }
  }

  async loadSchema(url, method) {
    let body = { "query": "\n    query IntrospectionQuery {\n      __schema {\n        queryType { name }\n        mutationType { name }\n        subscriptionType { name }\n        types {\n          ...FullType\n        }\n        directives {\n          name\n          description\n          locations\n          args {\n            ...InputValue\n          }\n        }\n      }\n    }\n\n    fragment FullType on __Type {\n      kind\n      name\n      description\n      fields(includeDeprecated: true) {\n        name\n        description\n        args {\n          ...InputValue\n        }\n        type {\n          ...TypeRef\n        }\n        isDeprecated\n        deprecationReason\n      }\n      inputFields {\n        ...InputValue\n      }\n      interfaces {\n        ...TypeRef\n      }\n      enumValues(includeDeprecated: true) {\n        name\n        description\n        isDeprecated\n        deprecationReason\n      }\n      possibleTypes {\n        ...TypeRef\n      }\n    }\n\n    fragment InputValue on __InputValue {\n      name\n      description\n      type { ...TypeRef }\n      defaultValue\n    }\n\n    fragment TypeRef on __Type {\n      kind\n      name\n      ofType {\n        kind\n        name\n        ofType {\n          kind\n          name\n          ofType {\n            kind\n            name\n            ofType {\n              kind\n              name\n              ofType {\n                kind\n                name\n                ofType {\n                  kind\n                  name\n                  ofType {\n                    kind\n                    name\n                  }\n                }\n              }\n            }\n          }\n        }\n      }\n    }\n  ", "operationName": "IntrospectionQuery" }
    let res: any;
    if (this.apicAgentService.isOnline()) {
      let response = await this.apicAgentService.runRequest({
        method,
        url,
        name: '',
        Req: {},
        Body: {
          type: 'raw',
          rawData: JSON.stringify(body),
          selectedRaw: { val: 'application/json' }
        }
      }, { inMem: {}, saved: {} });
      res = response.$response.data;
    } else {
      res = await this.httpClient.request(method, url, { body }).toPromise();
    }

    var typeObjs: any = {};
    var schema = res.data.__schema;
    schema.types.forEach(function (type) {
      typeObjs[type.name] = type;
    });
    typeObjs.Root = {
      name: 'Root',
      kind: 'APIC',
      fields: []
    }
    if (schema.queryType) {
      typeObjs.Root.fields.push({ name: 'query', type: { kind: 'OBJECT', name: schema.queryType.name } })
    }
    if (schema.mutationType) {
      typeObjs.Root.fields.push({ name: 'mutation', type: { kind: 'OBJECT', name: schema.mutationType.name } })
    }
    if (schema.subscriptionType) {
      typeObjs.Root.fields.push({ name: 'subscription', type: { kind: 'OBJECT', name: schema.subscriptionType.name } })
    }
    var suggests = [];
    Object.keys(typeObjs).forEach((name) => {
      var type = typeObjs[name];
      if (!name.startsWith('__')) {
        suggests.push({
          caption: name,
          value: name,
          meta: 'Type'
        })
        if (type.fields) {
          type.fields.forEach((f) => {
            suggests.push({
              caption: f.name,
              value: f.name + (this.isMainType(name) ? ' {}' : ''),
              meta: 'field'
            })
          })
        }
      }
    });
    typeObjs.suggests = suggests;
    return typeObjs
  }

  isMainType(name) {
    return ['Query', 'Subscription', 'Mutation'].indexOf(name) >= 0;
  }

  onTextChange() {
    this.propagateChange(this.text)
  }
  gqlVarsChanged() {
    this.onGqlVarsChange.next(this.gqlVars)
  }
}