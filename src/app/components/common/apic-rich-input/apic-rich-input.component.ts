import { Component, ElementRef, EventEmitter, forwardRef, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatAutocomplete, MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { Select } from '@ngxs/store';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Env, ParsedEnv } from 'src/app/models/Envs.model';
import { Utils } from 'src/app/services/utils.service';
import { EnvState } from 'src/app/state/envs.state';

@Component({
  selector: 'apic-rich-input',
  templateUrl: './apic-rich-input.component.html',
  styleUrls: ['./apic-rich-input.component.css'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ApicRichInputComponent),
      multi: true,
    },
  ],
})
export class ApicRichInputComponent implements OnInit, OnDestroy, ControlValueAccessor {
  @Input() matAutocomplete: MatAutocomplete;
  @Input() placeholder: string;
  @Output() focus = new EventEmitter();
  @ViewChild('editor') editor: ElementRef;
  @ViewChild(MatAutocompleteTrigger) autocomplete: MatAutocompleteTrigger;
  @Select(EnvState.getSelected) selectedEnv$: Observable<ParsedEnv>;
  @Select(EnvState.getInMemEnv) inMemEnv$: Observable<{ [key: string]: string }>;
  private _destroy = new Subject<boolean>();

  selectedEnv: ParsedEnv;
  inMemEnv = {};
  text = '';
  disabled: boolean = false;
  propagateChange: any = () => { };
  propagateTouch: any = () => { };

  constructor(
    private utils: Utils
  ) { }
  ngOnDestroy(): void {
    this._destroy.next();
    this._destroy.complete();
  }
  writeValue(value: any): void {
    this.text = value;

    setTimeout(() => {
      this.editor.nativeElement.innerText = value;
      this.onChangeHandle();
    }, 0);
  }
  registerOnChange(fn: any): void {
    this.propagateChange = fn;
  }
  registerOnTouched(fn: any): void {
    this.propagateTouch = fn;
  }
  setDisabledState?(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  ngOnInit(): void {
    this.selectedEnv$.pipe(takeUntil(this._destroy)).subscribe(val => {
      this.selectedEnv = val
    })
    this.inMemEnv$.pipe(takeUntil(this._destroy)).subscribe(val => {
      this.inMemEnv = val
    });
  }
  ngAfterViewInit() {
    this.editor.nativeElement.addEventListener('paste', function (e) {
      // Prevent the default action
      e.preventDefault();

      // Get the copied text from the clipboard
      const text = (e.clipboardData) ? (e.originalEvent || e).clipboardData.getData('text/plain') : '';

      if (document.queryCommandSupported('insertText')) {
        document.execCommand('insertText', false, text);
      } else {
        // Insert text at the current position of caret
        const range = document.getSelection().getRangeAt(0);
        range.deleteContents();

        const textNode = document.createTextNode(text);
        range.insertNode(textNode);
        range.selectNodeContents(textNode);
        range.collapse(false);

        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
      }
    });
  }

  onKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      return;
    }
  }

  onChangeHandle() {
    var text = this.editor.nativeElement.innerText, oldHtml = this.editor.nativeElement.innerHTML.replace(/&amp;/g, '&');
    var caret = this.getCaretPosition(this.editor.nativeElement);
    var parts = this.getEnvParts(text);
    var html = '';
    parts.forEach(function (part) {
      if (part.type === 'urlPart') {
        html += '<span class="urlPart">' + part.text + '</span>'
      } else {
        html += '<span class="env">' + part.text + '</span>'
      }
    });
    if (html !== oldHtml) {
      this.editor.nativeElement.querySelectorAll('.env').forEach(e => {
        e.removeEventListener('mouseenter', this.onMouseEnter)
        e.removeEventListener('mouseleave', this.onMouseLeave)
        e.removeEventListener('click', this.onMouseClick)
      })
      this.editor.nativeElement.innerHTML = html;
      this.editor.nativeElement.querySelectorAll('.env').forEach(e => {
        e.addEventListener('mouseenter', this.onMouseEnter.bind(this))
        e.addEventListener('mouseleave', this.onMouseLeave.bind(this))
        e.addEventListener('click', this.onMouseClick.bind(this))
      })
      if (caret > 0) {
        this.setCaretPosition(this.editor.nativeElement, caret);
      }
    }
    var newValue = this.editor.nativeElement.innerText;
    if (this.text !== newValue) {
      this.text = newValue;
      this.propagateChange(newValue);
      if (this.autocomplete) {
        this.autocomplete.openPanel();
      }
    }
  }

  onMouseEnter(e) {
    var resolvedVal = null, type = '';
    var res = this.resolveVal(e.target.innerText);
    resolvedVal = res.resolvedVal
    type = res.type;

    let popup = e.target.parentElement.nextElementSibling;
    let popupTip = popup.querySelector('.wysiwug-tooltip-head');
    if (type === 'Couldn\'t resolve environment varible') {
      popupTip.innerText = resolvedVal;
      popupTip.classList.add('red');
    } else {
      popupTip.innerText = resolvedVal || ' ';
      popupTip.classList.remove('red');
    }
    popup.querySelector('.wysiwug-tooltip-tail.align-right').innerText = type;
    popup.classList.add('show');
    popup.style.left = e.target.offsetLeft + 'px';
  }

  onMouseLeave(e) {
    let popup = e.target.parentElement.nextElementSibling;
    popup.classList.remove('show');
  }

  onMouseClick(e) {
    if (e.ctrlKey || e.metaKey) {
      this.utils.copyToClipboard(this.resolveVal(e.target.innerText).resolvedVal)
    }
  }

  getCaretPosition(element) {
    var selection = document.getSelection();
    if (selection.rangeCount > 0) {
      var _range = selection.getRangeAt(0)
      var range = _range.cloneRange()
      range.selectNodeContents(element)
      range.setEnd(_range.endContainer, _range.endOffset)
      return range.toString().length;
    } else {
      return 0
    }
  }

  getEnvParts(text) {
    var parts = [], foundAt = -1, scannedTill = -1;
    for (var i = 0; i < text.length; i++) {
      if (text.charAt(i) == '{' && text.charAt(i + 1) === '{' && foundAt < 0) {
        foundAt = i;
        var partText = text.substring(scannedTill + 1, foundAt);
        if (partText) {
          parts.push({
            text: partText,
            type: 'urlPart'
          });
          scannedTill = foundAt - 1;
        }
        i++;
      } else if (text.charAt(i) === '}' && text.charAt(i + 1) === '}' && foundAt >= 0) {
        parts.push({
          text: text.substring(foundAt, i + 2),
          type: 'env'
        });
        foundAt = -1, scannedTill = i + 1;
        i++;
      }
    }
    if (scannedTill < text.length) {
      var part = text.substring(scannedTill + 1, text.length);
      if (part) {
        parts.push({
          text: part,
          type: 'urlPart'
        });
      }
    }
    return parts;
  }

  setCaretPosition(el, pos) {
    // Loop through all child nodes
    for (var node of el.childNodes) {
      if (node.nodeType == 3) { // we have a text node
        if (node.length >= pos) {
          // finally add our range
          var range = document.createRange(),
            sel = window.getSelection();
          range.setStart(node, pos);
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
          return -1; // we are done
        } else {
          pos -= node.length;
        }
      } else {
        pos = this.setCaretPosition(node, pos);
        if (pos == -1) {
          return -1; // no need to finish the for loop
        }
      }
    }
    return pos; // needed because of recursion stuff
  }

  resolveVal(key) {
    key = key.substring(2, key.length - 2); // remove {{ & }}
    if (this.inMemEnv?.hasOwnProperty(key)) { //giving priority to in-mem vars
      return {
        resolvedVal: this.inMemEnv[key],
        type: 'Value read from In-memory env. Generated via script "setEnv(key, val)"'
      }
    } else if (this.selectedEnv?.vals?.hasOwnProperty(key)) {
      return {
        resolvedVal: this.selectedEnv.vals[key],
        type: 'Value read from selected environment'
      }
    } else {
      return {
        resolvedVal: 'Undefined variable',
        type: 'Couldn\'t resolve environment varible'
      }
    }
  }

  onFocus() {
    this.focus.next();
  }
}
