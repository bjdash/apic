import { Component, ElementRef, EventEmitter, Input, OnChanges, Output, SimpleChanges, ViewChild } from '@angular/core';

@Component({
    selector: 'response-builder-item',
    template: `
    <div *ngIf="!edit" class="vcenter full-height">
        <span class="truncate" [ngClass]="{
            info:resp.code.charAt(0)=='1',
            success:resp.code.charAt(0)=='2',
            warning:resp.code.charAt(0)=='3',
            error:resp.code.charAt(0)=='5'||resp.code.charAt(0)=='4'
        }">{{resp.code}}</span>
        <button type="button" mat-icon-button class="xs left-auto" *ngIf="!resp.fromTrait" (click)="enableEdit()">
            <mat-icon>edit</mat-icon>
        </button>
        <button type="button" mat-icon-button class="xs" color="warn" *ngIf="!resp.fromTrait" (click)="remove(index)">
            <mat-icon>close</mat-icon>
        </button>
    </div>
    <div *ngIf="edit" class="vcenter full-height">
        <input type="text" class="form-control input-xs" #input [(ngModel)]="inputModel" (keydown.enter)="finishEdit()"
            ng-change="vm.flags.traitPageDirty = true" />
        <button type="button" mat-icon-button class="xs left-auto" (click)="finishEdit()">
            <mat-icon class="green">check</mat-icon>
        </button>
    </div>
    `
})
export class ResponseBuilderItem {
    @Input() resp: any;
    @Input() index: number;
    @Output() onRemove = new EventEmitter<number>();
    @Output() onChange = new EventEmitter<number>();

    @ViewChild('input') input: ElementRef;

    inputModel: string;
    edit: boolean = false;

    constructor() {

    }

    remove(index: number) {
        this.onRemove.emit(index)
    }

    enableEdit() {
        this.inputModel = this.resp.code;
        this.edit = true;
        setTimeout(() => {
            (this.input.nativeElement as HTMLInputElement).focus();
        })
    }

    finishEdit() {
        if (this.resp.code !== this.inputModel) {
            this.resp.code = this.inputModel;
            this.onChange.emit()
        }
        this.edit = false;
    }
}