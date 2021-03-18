import { Directive, ElementRef, HostListener, Output, EventEmitter, Input, Component, Inject, Injectable } from '@angular/core';
import { MatDialog, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Directive({
    selector: '[confirm]'
})
export class ConfirmDirective {
    @Input() confirm: string;
    @Input() confirmTitle: string;
    @Input() confirmOk: string;
    @Input() confirmCancel: string;

    constructor(private el: ElementRef, public dialog: MatDialog) { }

    @Output('confirm-click') click: any = new EventEmitter();

    @HostListener('click', ['$event']) clicked(e) {
        const dialogRef = this.dialog.open(ConfirmDirectiveComponent, {
            data: {
                confirmTitle: this.confirmTitle || 'Are you sure you want to perform this action?',
                confirm: this.confirm || 'Confirm',
                confirmOk: this.confirmOk || 'Ok',
                confirmCancel: this.confirmCancel || 'Cancel'
            },
            width: '700px',
            panelClass: ''
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                this.click.emit();
            }
        });
    }
}

@Injectable()
export class ConfirmService {
    constructor(public dialog: MatDialog) { }

    confirm(options) {
        return new Promise<void>((resolve, reject) => {
            const dialogRef = this.dialog.open(ConfirmDirectiveComponent, {
                data: {
                    confirmTitle: options.confirmTitle || 'Are you sure you want to perform this action?',
                    confirm: options.confirm || 'Confirm',
                    confirmOk: options.confirmOk || 'Ok',
                    confirmCancel: options.confirmCancel || 'Cancel'
                },
                width: '700px',
                panelClass: ''
            });

            dialogRef.afterClosed().subscribe(result => {
                if (result) {
                    resolve();
                } else {
                    reject();
                }
            });
        })
    }
}

@Component({
    selector: "confirm-directive",
    template: `
	<div>
    <h4 class="red head">{{data.confirmTitle}}</h4>
    <div class="f18">{{data.confirm}}</div>
    <div class="align-right">
      <button type="submit" class="sm gap" mat-raised-button color="warn" cdkFocusInitial (click)="confirm()">{{data.confirmOk}}</button>
      <button mat-button mat-dialog-close class="sm">{{data.confirmCancel}}</button>
    </div>
  </div>
 `
})
export class ConfirmDirectiveComponent {
    constructor(@Inject(MAT_DIALOG_DATA) public data: any, public dialogRef: MatDialogRef<ConfirmDirectiveComponent>) { }

    confirm() {
        this.dialogRef.close(true);
    }
}
