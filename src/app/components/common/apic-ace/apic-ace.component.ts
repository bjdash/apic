import { DOCUMENT } from '@angular/common';
import { Component, ElementRef, EventEmitter, forwardRef, Inject, Input, OnChanges, OnDestroy, OnInit, Output, Renderer2, SimpleChanges, ViewChild } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { AceComponent } from 'ngx-ace-wrapper';

@Component({
  selector: 'apic-ace',
  templateUrl: './apic-ace.component.html',
  styleUrls: ['./apic-ace.component.scss'],
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => ApicAceComponent),
    multi: true
  }]
})
export class ApicAceComponent implements OnInit, ControlValueAccessor, OnDestroy {
  @Input() readOnly: boolean;
  @Input() mode: string;
  @Input() text: string;
  @Input() options: any;
  @Output() textChange = new EventEmitter();
  @ViewChild('editor', { read: ElementRef }) editor: ElementRef;
  @ViewChild('editor') ace: AceComponent;

  private _onChange = (_: any) => { };
  private _onTouched = () => { };

  originalHeight: 0;
  Y = 0;

  constructor(private renderer: Renderer2, @Inject(DOCUMENT) private document: Document) { }
  ngOnDestroy(): void {

  }
  writeValue(value: any): void {
    this.text = value;
  }
  registerOnChange(fn: any): void {
    this._onChange = fn;
  }
  registerOnTouched(fn: any): void {
    this._onTouched = fn;
  }

  ngOnInit(): void {
  }

  textChanged(e) {
    if (e != this.text) {
      this.text = e;
      this.textChange.emit(this.text);
      this._onChange(this.text)
    }
  }

  startResize(e) {
    e.preventDefault();
    this.Y = e.pageY;
    this.originalHeight = this.editor.nativeElement.offsetHeight;
    this.editor.nativeElement.style.opacity = 0.5;


    var moveListener = this.renderer.listen(document, 'mousemove', (e) => {
      var actualY = e.pageY;
      var diff = actualY - this.Y;
      this.editor.nativeElement.style.height = (this.originalHeight + diff) + 'px';
    })

    var upListener = this.renderer.listen(document, 'mouseup', (e) => {
      this.editor.nativeElement.style.opacity = 1;
      //cancel the listeners
      moveListener();
      upListener();
      this.refresh()
    })
  }

  refresh() {
    console.log(this.ace);

    this.ace.directiveRef.ace().resize()
  }

  focus() {
    this.ace.directiveRef.ace().focus();
  }

  getEditor() {
    return this.ace.directiveRef.ace();
  }
}
