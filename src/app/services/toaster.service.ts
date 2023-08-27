import { Injectable } from "@angular/core";
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';

@Injectable()
export class Toaster {
  config: MatSnackBarConfig = { horizontalPosition: 'center', verticalPosition: 'bottom', duration: 3000 }

  constructor(private snackBar: MatSnackBar) { }

  success(message: string, duration?: number) {
    this.snackBar.open(message, 'x', { ...this.config, ...(duration ? { duration } : {}), panelClass: 'success' });
  }
  error(message: string, duration?: number) {
    this.snackBar.open(message, 'x', { ...this.config, ...(duration ? { duration } : {}), panelClass: 'error' });
  }
  warn(message: string, duration?: number) {
    this.snackBar.open(message, 'x', { ...this.config, ...(duration ? { duration } : {}), panelClass: 'warning' });
  }
  info(message: string, duration?: number) {
    this.snackBar.open(message, 'x', { ...this.config, ...(duration ? { duration } : {}), panelClass: 'info' });
  }
}