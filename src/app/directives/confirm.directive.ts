import { Directive, ElementRef, HostListener, Output, EventEmitter, Input, Component, Inject, Injectable } from '@angular/core';
import { MatDialog, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { take } from 'rxjs/operators';

export interface CF_ConfirmOption {
    confirmTitle: string,
    confirm: string,
    confirmOk?: string,
    confirmCancel?: string,
    id?: string
}

export interface CF_AlertOption {
    confirmTitle: string,
    confirm: string,
    confirmOk?: string,
    id?: string
}

@Directive({
    selector: '[confirm]'
})
export class ConfirmDirective {
    @Input() confirm: string;
    @Input() confirmTitle: string;
    @Input() confirmOk: string;
    @Input() confirmCancel: string;
    @Input() type: string;

    constructor(private el: ElementRef, public dialog: MatDialog) { }

    @Output('confirm-click') click: any = new EventEmitter();

    @HostListener('click', ['$event']) clicked(e) {
        const dialogRef = this.dialog.open(ConfirmDirectiveComponent, {
            data: {
                confirmTitle: this.confirmTitle || 'Are you sure you want to perform this action?',
                confirm: this.confirm || 'Confirm',
                confirmOk: this.confirmOk || 'Ok',
                confirmCancel: this.confirmCancel || 'Cancel',
                type: this.type
            },
            width: '700px',
            panelClass: ''
        });

        dialogRef.afterClosed().pipe(take(1)).subscribe(result => {
            if (result?.status) {
                this.click.emit();
            }
        });
    }
}

@Injectable()
export class ConfirmService {
    private openedDialogMap = {};
    constructor(public dialog: MatDialog) { }

    confirm(options: CF_ConfirmOption) {
        return new Promise<void>((resolve, reject) => {
            const dialogRef = this.dialog.open(ConfirmDirectiveComponent, {
                data: {
                    confirmTitle: options.confirmTitle || 'Confirm',
                    confirm: options.confirm || 'Are you sure you want to perform this action?',
                    confirmOk: options.confirmOk || 'Ok',
                    confirmCancel: options.confirmCancel || 'Cancel',
                    id: options.id
                },
                width: '700px',
                panelClass: ''
            });

            dialogRef.afterClosed().subscribe(result => {
                if (result?.status) {
                    resolve();
                } else {
                    reject();
                }
            });
        })
    }

    alert(options: CF_AlertOption) {
        var p = new Promise<void>((resolve, reject) => {
            const dialogRef = this.dialog.open(ConfirmDirectiveComponent, {
                data: {
                    confirmTitle: options.confirmTitle || 'Alert',
                    confirm: options.confirm || 'Are you sure you want to perform this action?',
                    confirmOk: options.confirmOk || 'Ok',
                    type: 'alert',
                    id: options.id
                },
                width: '700px',
                panelClass: ''
            });

            if (options.id) {
                if (this.openedDialogMap[options.id]) {
                    this.openedDialogMap[options.id].close();
                }
                this.openedDialogMap[options.id] = dialogRef;

            }

            dialogRef.afterClosed().subscribe(result => {
                if (result?.status) {
                    resolve();
                } else {
                    reject();
                }
                if (result?.id && this.openedDialogMap[result.id]) {
                    delete this.openedDialogMap[result.id];
                }
            });
        });

        return p;
    }
}

@Component({
    selector: "confirm-directive",
    template: `
	<div>
    <h4 class="red head">{{data.confirmTitle}}</h4>
    <div class="f18">{{data.confirm}}</div>
    <div class="align-right">
      <button type="button" class="sm gap" mat-raised-button color="warn" cdkFocusInitial (click)="confirm()">{{data.confirmOk}}</button>
      <button type="button" mat-button class="sm" *ngIf="data.type !== 'alert'" (click)="cancel()">{{data.confirmCancel}}</button>
    </div>
  </div>
 `
})
export class ConfirmDirectiveComponent {
    constructor(@Inject(MAT_DIALOG_DATA) public data: any, public dialogRef: MatDialogRef<ConfirmDirectiveComponent>) { }

    confirm() {
        this.dialogRef.close({ id: this.data.id, status: true });
    }

    cancel() {
        this.dialogRef.close({ id: this.data.id, status: false });
    }
}
