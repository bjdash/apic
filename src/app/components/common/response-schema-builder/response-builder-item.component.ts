import { Component, ElementRef, EventEmitter, Input, OnChanges, Output, SimpleChanges, ViewChild } from '@angular/core';
import { ApiResponse } from 'src/app/models/ApiProject.model';
import { Toaster } from 'src/app/services/toaster.service';

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
        <button type="button" mat-icon-button class="xs left-auto" *ngIf="resp.importedVia != 'Trait'" (click)="enableEdit()">
            <mat-icon>edit</mat-icon>
        </button>
        <button type="button" mat-icon-button class="xs" color="warn" *ngIf="resp.importedVia != 'Trait'" (click)="remove(index)">
            <mat-icon>close</mat-icon>
        </button>
    </div>
    <div *ngIf="edit" class="vcenter full-height">
        <input type="text" class="form-control input-xs" #input [(ngModel)]="inputModel" (keydown.enter)="finishEdit($event)" (keydown.escape)="inputModel=resp.code;edit=false")
            ng-change="vm.flags.traitPageDirty = true" pattern="^[a-zA-Z0-9\-\_]$" />
        <button type="button" mat-icon-button class="xs left-auto" (click)="finishEdit()">
            <mat-icon class="green">check</mat-icon>
        </button>
    </div>
    `
})
export class ResponseBuilderItem {
    @Input() resp: ApiResponse;
    @Input() index: number;
    @Input() allowNamedResponse: boolean;
    @Output() onRemove = new EventEmitter<number>();
    @Output() onChange = new EventEmitter<ApiResponse>();

    @ViewChild('input') input: ElementRef;

    inputModel: string;
    edit: boolean = false;

    constructor(private toaster: Toaster) {

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

    finishEdit($event?) {
        $event?.stopPropagation();
        $event?.preventDefault();
        if (!this.inputModel) {
            this.toaster.error('Please enter a status code.');
            return;
        }
        if (this.resp.code !== this.inputModel) {
            var nonStatus = false;
            if (! /^\d+$/.test(this.inputModel)) {
                nonStatus = true
            }
            if (!this.inputModel.match(/^[a-zA-Z0-9\-\_]+$/)) {
                this.toaster.error('Response name can only contain A-Z a-z 0-9 - _');
                return;
            }
            if (nonStatus && !this.allowNamedResponse) {
                this.toaster.error('Please use a status code here like 200 or 404.');
                return;
            }
            this.onChange.emit({ ...this.resp, code: this.inputModel, noneStatus: nonStatus })
        }
        this.edit = false;
    }
}
