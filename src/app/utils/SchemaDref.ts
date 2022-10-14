//TODO: use https://www.npmjs.com/package/json-schema-ref-parser
import { Utils } from "../services/utils.service";

interface Memory {
    [$ref: string]: any;
}

export class SchemaDref {

    private $ref = '$ref';

    dereference(object: any): any {
        if (object && typeof object === 'object') {
            const duplicate = Utils.clone(object);
            return Utils.clone(this.resolve(duplicate));
        }
        return Utils.clone(object);
    }

    resolve(object: any, root: any = object, memory: Memory = {}): any {
        if (object !== null && typeof object === 'object') {
            const properties = this.getProperties(object);
            if (properties.includes(this.$ref)) {
                if (properties.length !== 1) {
                    throw new Error(`References cannot have sibling properties ${object}`);
                }

                if (memory[object.$ref] !== undefined) {
                    object = memory[object.$ref];
                } else {
                    const ref = this.traverse(root, object.$ref);
                    object = memory[object.$ref] = this.resolve(ref, root, memory);
                }
            } else {
                properties.forEach((p) => object[p] = this.resolve(object[p], root, memory));
            }
        }
        return object;
    }

    getProperties(object: any): string[] {
        return Object.getOwnPropertyNames(object);
    }

    traverse(object: any, pointer: string): any {
        const ref = pointer.split('#');
        const [id, path, decoder] = this.isFragment(pointer) ? [ref[0], ref[1], decodeURIComponent] : ['', ref[0], (i) => i];

        if (id !== '' && id !== object.id) {
            throw new Error(`The library does not support foreign references ${pointer}`);
        }
        const parts = path.split('/');
        if (!parts.length || parts[0] !== '') {
            throw new Error(`Bad JSON pointer ${pointer}`);
        }
        return this.stepThrough(object, parts.slice(1), decoder);
    }

    isFragment(pointer: string): boolean {
        if (!pointer.includes('#')) {
            return false;
        }
        if (pointer.match(/#/g).length === 1) {
            return true;
        }
        throw new Error(`Bad URI fragment identifier ${pointer}`);
    }

    stepThrough(object: any, keys: string[], decoder: (str: string) => string = decodeURIComponent): any {
        if (!keys.length) {
            return object;
        }

        const key = decoder(keys.shift()).replace(/~0/g, '~').replace(/~1/g, '/');
        if (object[key] === undefined) {
            throw new Error(`Object does not have a property of '${key}'`);
        }
        return this.stepThrough(object[key], keys, decoder);
    }

}
