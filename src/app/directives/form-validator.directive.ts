import { Directive, ElementRef, HostListener } from '@angular/core';

@Directive({
  selector: 'form'
})
export class FormValidatorDirective {

  constructor(private el: ElementRef) { }

  @HostListener('submit')
  onFormSubmit(e) {
    this.el.nativeElement.querySelectorAll('.ng-invalid').forEach(ele => {
      ele.classList.add('invalid-input')
    })
  }

}
