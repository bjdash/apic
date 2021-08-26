import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class RememberService {
  private stuff = {}
  constructor() { }

  set(key: string, val: any) {
    this.stuff[key] = val;
  }

  get(key: string): any {
    return this.stuff[key];
  }

  patch(key: string, val: any) {
    this.stuff[key] = { ...this.stuff[key], ...val }
  }
}
