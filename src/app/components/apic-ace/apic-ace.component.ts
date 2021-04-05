import { DOCUMENT } from '@angular/common';
import { Component, ElementRef, EventEmitter, Inject, Input, OnChanges, OnInit, Output, Renderer2, SimpleChanges, ViewChild } from '@angular/core';
import { AceEditorComponent } from 'ng2-ace-editor';

@Component({
  selector: 'apic-ace',
  templateUrl: './apic-ace.component.html',
  styleUrls: ['./apic-ace.component.css']
})
export class ApicAceComponent implements OnInit {
  @Input() readOnly: boolean;
  @Input() mode: string;
  @Input() text: string;
  @Output() textChange = new EventEmitter();
  @ViewChild('editor', { read: ElementRef }) editor: ElementRef;
  @ViewChild('editor') ace: AceEditorComponent;


  originalHeight: 0;
  Y = 0;

  constructor(private renderer: Renderer2, @Inject(DOCUMENT) private document: Document) { }
  ngOnInit(): void {
  }

  textChanged() {
    this.textChange.emit(this.text);
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
    })
  }

  refresh() {
    this.ace.getEditor().resize()
  }

  focus() {
    this.ace.getEditor().focus();
  }
}
