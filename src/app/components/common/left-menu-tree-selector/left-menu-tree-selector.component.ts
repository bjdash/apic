import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormControl } from '@angular/forms';
import { TreeSelectorOptn } from '../tree-selector/tree-selector.component';


export interface LeftMenuTreeSelectorOptn {
  doneText?: string,
  title?: string,
  treeOptions?: TreeSelectorOptn //options for tree selector
}

@Component({
  selector: 'left-menu-tree-selector',
  templateUrl: './left-menu-tree-selector.component.html',
  styleUrls: ['./left-menu-tree-selector.component.scss']
})
export class LeftMenuTreeSelectorComponent implements OnInit {
  @Input() items: any[];
  @Input() options: LeftMenuTreeSelectorOptn;
  @Output() onClose = new EventEmitter();
  @Output() onDone = new EventEmitter();

  model = new FormControl('');

  constructor() { }

  ngOnInit(): void {
  }

  done() {
    this.onDone.next(this.model.value);
  }

  close() {
    this.onClose.next(true);
  }
}
