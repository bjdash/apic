import { NgModule, ModuleWithProviders, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { JsonSchemaComponent } from './jsonschema/jsonschema.component';
import { MainJsonSchemaComponent } from './main/main.component';
import { FieldJsonSchemaComponent } from './field/field.component';
import { SelectSchemaJsonSchemaComponent } from './field/selectschema.component';
import { StateService } from './state.service';

import { AceEditorModule } from 'ng2-ace-editor';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

export const CustomDirectives = [
  JsonSchemaComponent,
  MainJsonSchemaComponent,
  FieldJsonSchemaComponent,
  SelectSchemaJsonSchemaComponent,
];

export const NgBrDirectives = {
  JsonSchemaComponent,
  MainJsonSchemaComponent,
  FieldJsonSchemaComponent,
  SelectSchemaJsonSchemaComponent,
};

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    AceEditorModule,
    MatTabsModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule
  ],
  declarations: [CustomDirectives],
  exports: [CustomDirectives],
  providers: [
    StateService,
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => JsonSchemaComponent),
      multi: true,
    },
  ],
})
class NgJsonSchemaBuilder {
  public static forRoot(): ModuleWithProviders<any> {
    return {
      ngModule: NgJsonSchemaBuilder,
    };
  }
}
export { NgJsonSchemaBuilder };
