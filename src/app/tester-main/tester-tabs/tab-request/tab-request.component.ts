import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { HTTP_METHODES, RAW_BODY_TYPES } from 'src/app/utils/constants';

@Component({
  selector: 'app-tab-request',
  templateUrl: './tab-request.component.html',
  styleUrls: ['./tab-request.component.scss']
})
export class TabRequestComponent implements OnInit {
  httpMethods = HTTP_METHODES;
  RAW_BODY_TYPES = RAW_BODY_TYPES;
  form: FormGroup;

  dummy = ''

  flags = {
    showReq: true,
    reqTab: 'ReqParam'
  }
  constructor(private fb: FormBuilder) {
    this.form = fb.group({
      method: ['POST'],
      url: [''],
      urlParams: [[]],
      headers: [[]],
      Body: fb.group({
        type: ['raw'],
        selectedRaw: [{ name: "JSON", val: "application/json" }],
        xForms: [[]],
        formData: [[]],
        rawData: ['test']
      }),
      selectedRawx: [{ name: "JSON", val: "application/json" }],
    });
  }


  ngOnInit(): void {
  }

  selectTab(type: string, name: string) {
    this.flags[type] = name;
    //TODO: Utils.storage.set(type, name);
  }

  initRawBody() {
    // vm.Editor.Req.object.completers = [];
    // changeEditorMode(vm.Body.selectedRaw.name, 'Req');
  }
  initGQLBody() {
    // vm.Editor.Req.object.completers = [{
    //     getCompletions: function (editor, session, pos, prefix, callback) {
    //         callback(null, vm.GQLSuggests);
    //     }
    // }]
    // changeEditorMode('graphql', 'Req');
    // GraphQL.loadSchema(vm.URL, vm.METHOD).then(function (types) {
    //     console.log(types);
    //     vm.GQLTypes = types;
    //     vm.GQLSuggests = types.suggests;
    //     delete types.suggests;
    // }, function (e) {
    //     vm.GQLTypes = null;
    // })
  }

  removeAuthHeader() {
    // Utils.removeHeader('Authorization', vm.REQ.headers);
    // toastr.info('Authorization header removed.');
  }

}
