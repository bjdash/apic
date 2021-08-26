import { Injectable } from "@angular/core";
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';

@Injectable()
export class Toaster {
    config: MatSnackBarConfig = { horizontalPosition: 'right', verticalPosition: 'bottom', duration: 2500 }

    constructor(private snackBar: MatSnackBar) { }

    success(message: string) {
        this.snackBar.open(message, 'x', { ...this.config, panelClass: 'success' });
    }
    error(message: string) {
        this.snackBar.open(message, 'x', { ...this.config, panelClass: 'error' });
    }
    warn(message: string) {
        this.snackBar.open(message, 'x', { ...this.config, panelClass: 'warning' });
    }
    info(message: string) {
        this.snackBar.open(message, 'x', { ...this.config, panelClass: 'info' });
    }
}