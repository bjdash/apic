import { AfterViewInit, Component, ElementRef, OnInit } from '@angular/core';
import * as marked from 'marked';

@Component({
  selector: 'markdown, [markdown]',
  template: '<ng-content></ng-content>',
  styleUrls: ['./markdown.component.scss']
})
export class MarkdownComponent implements OnInit, AfterViewInit {

  constructor(public element: ElementRef<HTMLElement>) { }

  ngOnInit(): void {
  }

  ngAfterViewInit(): void {
    let markdown = this.element.nativeElement.innerHTML;
    let compiled = marked.parse(markdown, {});
    this.element.nativeElement.innerHTML = compiled;
  }
}
