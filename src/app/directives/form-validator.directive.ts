import { Directive, ElementRef, HostListener } from '@angular/core';
import { FormGroupDirective } from '@angular/forms';

@Directive({
  selector: 'form[formGroup]'
})
export class FormValidatorDirective {

  constructor(private el: ElementRef, private fg: FormGroupDirective) { }

  @HostListener('submit')
  onFormSubmit(e) {
    if (this.fg.form.controls) {
      Object.entries(this.fg.form.controls).forEach(([key, formControl]) => {
        formControl.markAsDirty();
      })
    }
  }

}
