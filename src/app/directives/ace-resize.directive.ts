import { DOCUMENT } from '@angular/common';
import { AfterViewInit, Inject, NgZone, OnInit, Renderer2 } from '@angular/core';
import { ElementRef, Directive } from '@angular/core';

@Directive({
  selector: '[apicAceResize]'
})
export class AceResizeDirective implements OnInit, AfterViewInit {
  originalHeight: 0;
  Y = 0;

  constructor(private el: ElementRef, private renderer: Renderer2, @Inject(DOCUMENT) private document: Document) { }

  ngOnInit(): void {

  }
  ngAfterViewInit() {
    const handler = this.renderer.createElement('div');
    handler.className = 'ace-drag'

    this.renderer.listen(handler, 'mousedown', (e) => {
      e.preventDefault();
      this.Y = e.pageY;
      this.originalHeight = this.el.nativeElement.offsetHeight;
      this.el.nativeElement.style.opacity = 0.5;


      var moveListener = this.renderer.listen(document, 'mousemove', (e) => {
        var actualY = e.pageY;
        var diff = actualY - this.Y;
        console.log('cahnged', diff);
        this.el.nativeElement.style.height = (this.originalHeight + diff) + 'px';
      })

      var upListener = this.renderer.listen(document, 'mouseup', (e) => {
        console.log('cancelling');
        this.el.nativeElement.style.opacity = 1;
        moveListener(); //cancel the listener
        upListener();
      })
    })

    console.log(this.el.nativeElement);

    this.renderer.appendChild(this.el.nativeElement.parentNode, handler);
  }
}
