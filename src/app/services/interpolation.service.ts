import { Injectable } from '@angular/core';
import { Select } from '@ngxs/store';
import { parse, eval as _eval } from 'expression-eval';
import { Observable } from 'rxjs';
import { Env, ParsedEnv } from '../models/Envs.model';
import { EnvState } from '../state/envs.state';
import apic from '../utils/apic';


interface Rule {
  match: string,
  key: string
}
//TODO: Add support for laternative text, modifiers etc- see: https://www.npmjs.com/package/string-interpolation
@Injectable({
  providedIn: 'root'
})
export class InterpolationService {
  @Select(EnvState.getSelected) selectedEnv$: Observable<ParsedEnv>;
  @Select(EnvState.getInMemEnv) inMemEnv$: Observable<{ [key: string]: string }>;

  selectedEnv: ParsedEnv;
  inMemEnv = {};
  readonly delimiter = ['{{', '}}'];
  context: any = {}
  constructor() {
    this.selectedEnv$.subscribe(val => {
      this.selectedEnv = val
    })
    this.inMemEnv$.subscribe(val => {
      this.inMemEnv = val
    })
  }

  interpolate(str: string) {
    const rules: Rule[] = this.parseRules(str);
    if (rules && rules.length > 0) {
      let context = { ...(this.selectedEnv?.vals || {}), ...this.inMemEnv, apic };
      return this.parseFromRules(str, context, rules);
    }

    return str;
  }

  private parseRules(str: string): Rule[] {
    const execRegex = this.getRegex();
    const matches = str.match(execRegex);
    return (matches || []).map(match => {
      return { match, key: match.replace(new RegExp(this.delimiterStart(), 'g'), '').replace(new RegExp(this.delimiterEnd(), 'g'), '') }
    })
  }

  private parseFromRules(str: string, data: any, rules: Rule[]) {
    return rules.reduce((reducedStr, rule) => this.applyRule(reducedStr, rule, data), str);
  }

  private applyRule(str, rule: Rule, data = {}) {
    const dataToReplace = this.applyData(rule.key, data);
    if (dataToReplace) {
      return str.replace(rule.match, dataToReplace);
    }
  }

  private applyData(key: string, data: any) {
    const ast = parse(key); // abstract syntax tree (AST)
    return _eval(ast, data);
  }

  private getRegex() {
    const regex = `${this.delimiterStart()}([^}]+)${this.delimiterEnd()}`;
    return new RegExp(regex, 'gi');
  }

  hasVariables(str: string): boolean {
    const execRegex = this.getRegex();
    if (!str) return false;
    let match = str.match(execRegex);
    return match?.length > 0;
  }

  delimiterStart() {
    return this.delimiter[0];
  }

  delimiterEnd() {
    return this.delimiter[1];
  }
}
