import { Injectable } from '@angular/core';
import { Select } from '@ngxs/store';
import { parse, eval as _eval } from 'expression-eval';
import { Observable } from 'rxjs';
import { Env, ParsedEnv } from '../models/Envs.model';
import { EnvState } from '../state/envs.state';
import apic from '../utils/apic';
import { Utils } from './utils.service';

export interface InterpolationOption {
  useInMemEnv?: boolean,
  useEnv?: ParsedEnv
}
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

  interpolate(str: string, option?: InterpolationOption) {
    const rules: Rule[] = this.parseRules(str);
    if (rules && rules.length > 0) {
      let envToUse;
      if (option?.hasOwnProperty('useEnv')) {
        envToUse = option.useEnv
      } else {
        envToUse = this.selectedEnv;
      }
      let context = { ...(envToUse?.vals || {}), ...((option?.useInMemEnv) ? this.inMemEnv : {}), apic };
      return this.parseFromRules(str, context, rules);
    }

    return str;
  }

  interpolateObject(obj: { [key: string]: string }, option?: InterpolationOption): { [key: string]: string } {
    return Utils.objectEntries(obj).reduce((reduced, [key, val]) => {
      reduced[this.interpolate(key, option)] = this.interpolate(val, option)
      return reduced;
    }, {})
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
    return str.replace(rule.match, dataToReplace);
  }

  private applyData(key: string, data: any) {
    const ast = parse(key); // abstract syntax tree (AST)
    let evaluated = _eval(ast, data);
    if (!evaluated) evaluated = '';
    return evaluated;
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

  /**
   * Method to return a string to be used inside an expression
   * eg: {{abc}} -> abc
   * asdf{{abc}} -> 'asdf'+abc
   * asdf{{abc}}xyz ->  'asdf'+abc+'xyz
   */
  getExpressionString(str: string) {
    let originalStr = str;
    const execRegex = this.getRegex();
    const matches = str.match(execRegex);
    matches.forEach((match, index) => {
      let prefix = '\' + ';
      let postfix = ' + \'';
      if (index == 0 && str.startsWith(this.delimiterStart())) { prefix = '' }
      if (index == (matches.length - 1) && str.endsWith(this.delimiterEnd())) { postfix = '' }

      let replaced = prefix + match.replace(new RegExp(this.delimiterStart(), 'g'), '').replace(new RegExp(this.delimiterEnd(), 'g'), '') + postfix;
      str = str.replace(match, replaced)
    });
    if (!originalStr.startsWith(this.delimiterStart())) str = '\'' + str;
    if (!originalStr.endsWith(this.delimiterEnd())) str = str + '\'';
    return str;
  }
}
