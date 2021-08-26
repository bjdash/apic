import { Toaster } from './../services/toaster.service';
import { Directive, ElementRef, HostListener } from '@angular/core';

@Directive({
  selector: '[onlyAlphaNumericInput]'
})
export class OnlyAlphaNumericInputDirective {
  initialValue: string = '';

  constructor(private el: ElementRef, private toaser: Toaster) {
    setTimeout(() => {
      this.validate();
    })
  }

  @HostListener('keyup') onKeyUp() {
    this.validate();
  }

  @HostListener('focus') onFocus() {
    this.initialValue = this.el.nativeElement.value;
    this.el.nativeElement.classList.remove('unchanged-input')
    this.validate();
  }

  @HostListener('blur') onBlur() {
    console.log('validating')
    if (this.el.nativeElement.value == this.initialValue) {
      this.el.nativeElement.classList.add('unchanged-input');
    } else if (this.el.nativeElement.classList.contains('invalid-input')) {
      this.el.nativeElement.classList.remove('invalid-input');
      this.el.nativeElement.value = this.initialValue;
      this.el.nativeElement.classList.add('unchanged-input');
      this.toaser.warn('An alphanumeric input had invalid value. Previous valid value was restored.')
    } ``
  }

  validate() {
    var value = this.el.nativeElement.value;
    var re = /^[a-z_]+[a-z0-9_]*$/i;
    if (re.test(value)) {
      if (this.el.nativeElement.classList.contains('invalid-input')) {
        this.el.nativeElement.classList.remove('invalid-input');
        this.el.nativeElement.title = '';
      }
    } else {
      if (!this.el.nativeElement.classList.contains('invalid-input')) {
        this.el.nativeElement.classList.add('invalid-input');
        this.el.nativeElement.title = 'This input should only contain alpha numeric value and start with an alphabet or _(underscore).'
      }
    }
  }
}
