//if file is modified then run tsc --project tsconfig.sandbox.json to generate the required js file before startign the application
//Test globals
var $scriptType, $response, $request, $env;
export class SandboxMessanger {
    constructor() {
    }
    initialize() {
        window.addEventListener('message', (event) => {
            let eventData = event.data;
            if (eventData.type === 'TestMessage') {
                this.onTestMessage(eventData.payload);
            }
            else if (eventData.type === 'SchemaValidationMessage') {
                this.onSchemaValidationMessage(eventData.payload);
            }
        }, false);
    }
    onTestMessage(payload) {
        let runResullt = new SandboxTester(payload).runTest();
        this.#sendResponseBack(runResullt);
    }
    onSchemaValidationMessage(payload) {
        let response = {
            valid: false
        };
        try {
            response.valid = apic.validateSchema(payload.schema, payload.data);
        }
        catch (error) {
            console.log(error);
            response.error = error;
        }
        this.#sendResponseBack(response);
    }
    #sendResponseBack(msg) {
        window.parent.postMessage(msg, '*');
    }
}
export class SandboxTester {
    payload;
    static #TEST_RUN_CONTEXT = {
        envs: {
            saved: {},
            inMem: {}
        },
        logs: [],
        tests: [],
        scriptError: null
    };
    constructor(payload) {
        this.payload = payload;
        SandboxTester.#TEST_RUN_CONTEXT = {
            envs: {
                saved: {},
                inMem: {}
            },
            logs: [],
            tests: [],
            scriptError: null
        };
        $scriptType = payload.type;
        $request = { ...payload.$request };
        $response = payload.$response;
        $env = { ...payload.envs.saved, ...payload.envs.inMem };
    }
    runTest() {
        let code = this.#prepareScript(this.payload.script || this.payload.$request[this.payload.type]);
        Object.freeze($env);
        Object.freeze($request);
        Object.freeze($response);
        try {
            eval(code);
        }
        catch (e) {
            SandboxTester.#TEST_RUN_CONTEXT.scriptError = e?.message || e?.stack || e.toString();
            console.error('error', e);
            apic.log(`Error: ${e?.message || e?.stack || e.toString()}`);
        }
        return {
            type: $scriptType,
            inMem: SandboxTester.#TEST_RUN_CONTEXT.envs.inMem,
            logs: SandboxTester.#TEST_RUN_CONTEXT.logs,
            tests: SandboxTester.#TEST_RUN_CONTEXT.tests,
            scriptError: SandboxTester.#TEST_RUN_CONTEXT.scriptError
        };
    }
    #prepareScript(code) {
        return '(function (){\n' + code + '\n})()';
    }
    static log(str) {
        SandboxTester.#TEST_RUN_CONTEXT.logs.push(str);
    }
    static addTest(test) {
        SandboxTester.#TEST_RUN_CONTEXT.tests.push(test);
    }
    static setEnv(key, value) {
        if (!key)
            return false;
        if (!SandboxTester.#TEST_RUN_CONTEXT.envs.inMem)
            SandboxTester.#TEST_RUN_CONTEXT.envs.inMem = {};
        SandboxTester.#TEST_RUN_CONTEXT.envs.inMem = { ...SandboxTester.#TEST_RUN_CONTEXT.envs.inMem, [key]: value };
        return true;
    }
    static removeEnv(key) {
        if (key) {
            let { [key]: omit, ...rest } = SandboxTester.#TEST_RUN_CONTEXT.envs.inMem;
            SandboxTester.#TEST_RUN_CONTEXT.envs.inMem = rest;
        }
    }
    static getEnv(key) {
        if (SandboxTester.#TEST_RUN_CONTEXT.envs.inMem?.hasOwnProperty(key))
            return SandboxTester.#TEST_RUN_CONTEXT.envs.inMem[key];
        else
            return SandboxTester.#TEST_RUN_CONTEXT.envs.saved?.[key];
    }
    static validateSchema(code) {
        if (code === undefined) {
            code = $response.status || undefined;
        }
        var valid = false;
        if (code !== undefined && $request.respCodes) {
            let codeStr = `${code}`;
            var response = $request.respCodes.find(resp => resp.code == codeStr);
            //response schema is defined against content type so try to find the schema defined against current response content type header else fallback to application/json or at index 0
            let schema = response.data.find(respItem => { return (respItem.mime == $response.headers['content-type']) || ($response.headers['content-type']?.indexOf(respItem.mime) == 0); })?.schema;
            if (!schema) {
                schema = response.data.find(respItem => respItem.mime === 'application/json')?.schema;
            }
            if (!schema) {
                schema = response.data?.[0]?.schema;
            }
            if (!schema)
                return false;
            valid = apic.validateSchema(schema, $response.data);
        }
        return valid;
    }
}
export class apic {
    static log(...args) {
        let argsString = [];
        for (let i = 0; i < args.length; i++) {
            try {
                argsString.push(JSON.stringify(args[i]));
            }
            catch (e) {
                argsString.push(`'Error parsing data. Could not convert to string: ${e.message}`);
            }
        }
        SandboxTester.log(argsString.join(', '));
    }
    static randomStr(minLen, maxLen) {
        if (minLen < 1) {
            return '';
        }
        if (maxLen !== undefined) {
            minLen = apic.randomNum(minLen, maxLen);
        }
        return new Array(minLen).join().replace(/(.|$)/g, function () {
            return ((Math.random() * 36) | 0).toString(36)[Math.random() < .5 ? 'toString' : 'toUpperCase']();
        });
    }
    static randomNum(min, max, isFloat = false) {
        min = min === undefined || typeof min !== 'number' ? 0 : min;
        max = max === undefined || typeof min !== 'number' ? 0 : max;
        if (isFloat) {
            return Math.random() * (max - min) + min;
        }
        else {
            return Math.floor(Math.random() * (max - min + 1)) + min;
        }
    }
    static randomEmail() {
        return apic.randomStr(5) + '.' + apic.randomStr(4) + '@' + apic.randomStr(4) + '.' + apic.randomStr(3);
    }
    static randomInList(list) {
        if (!list || list.length === 0) {
            return undefined;
        }
        var index = apic.randomNum(0, list.length - 1);
        return list[index];
    }
    static time() {
        return new Date().getTime();
    }
    static s4() {
        return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    }
    static s8() {
        return apic.s4() + apic.s4();
    }
    static s12() {
        return apic.s4() + apic.s4() + apic.s4();
    }
    static uuid() {
        return apic.s4() + apic.s4() + '-' + apic.s4() + '-' + apic.s4() + '-' + apic.s4() + '-' + apic.s4() + apic.s4() + apic.s4();
    }
    static dataId() {
        var prefix = '', possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', index = 0;
        for (index = 0; index < 3; index++) {
            prefix += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return prefix + apic.s4() + apic.s4();
    }
    static removeDemoItems(items) {
        var itemsToReturn = [];
        if (items instanceof Array) {
            for (var i = 0; i < items.length; i++) {
                if (items[i]._id.indexOf('-demo') < 0) {
                    itemsToReturn.push(items[i]);
                }
            }
        }
        else if (items._id.indexOf('-demo') < 0) {
            itemsToReturn.push(items);
        }
        return itemsToReturn;
    }
    static test(name, testFn) {
        try {
            testFn();
            SandboxTester.addTest({
                name: name,
                success: true
            });
        }
        catch (e) {
            SandboxTester.addTest({
                name: name,
                success: false,
                reason: e.message
            });
        }
    }
    static _try(testFn) {
        try {
            testFn();
        }
        catch (e) {
            SandboxTester.log(`Error: ${e.message}`);
        }
    }
    static basicAuth(userName, password) {
        return "Basic " + btoa(userName + ":" + password);
    }
    static validateSchema(schema, obj) {
        if (!Ajv)
            return false;
        let validator = new Ajv(), valid = false;
        valid = validator.validate(schema, obj);
        if (valid)
            return valid;
        else
            throw new Error(validator.errorsText());
    }
}
//global functions
function log(...args) {
    apic.log(args);
}
function setEnv(key, value) {
    return SandboxTester.setEnv(key, value);
}
function removeEnv(key) {
    SandboxTester.removeEnv(key);
}
function getEnv(key) {
    return SandboxTester.getEnv;
}
