//@ts-check

var TEST_RUN_CONTEXT = {
    envs: { saved: null, inMem: null },
    logs: [],
    tests: [],
    scriptError: null
}
var $scriptType, $response, $request, $env;

/**
 * @param {Object} msg
 * @param {'prescript' | 'postscript'} msg.type
 * @param {Object} msg.inMem
 * @param {string[]} msg.logs
 * @param {Object[]} msg.tests
 * @param {Object} msg.scriptError
 */
function sendResponseBack(msg) {
    window.parent.postMessage(msg, '*');
}

/**
 * @param {Object} data
 * @param {'prescript' | 'postscript'} data.type
 * @param {string} data.script
 * @param {Object} data.$request
 * @param {Object} data.$response
 * @param {Object} data.envs
 * @param {Object} data.envs.saved
 * @param {Object} data.envs.inMem
 */
function onMessageReceived(data) {
    TEST_RUN_CONTEXT = {
        envs: data.envs,
        logs: [],
        tests: [],
        scriptError: null
    };
    $scriptType = data.type;
    $request = { ...data.$request };
    $response = data.$response;
    let code = data.script || data.$request[data.type];
    code = prepareScript(code);
    $env = { ...data.envs.saved, ...data.envs.inMem };
    Object.freeze($env);
    Object.freeze($request);
    Object.freeze($response)

    try {
        eval(code);
    } catch (e) {
        TEST_RUN_CONTEXT.scriptError = e?.message || e?.stack || e.toString();
        console.error('error', e);
        log(`Error: ${e?.message || e?.stack || e.toString()}`);
    }
    // reqObj.tests = TESTSX.concat(convertToTestX(TESTS));
    // reqObj.testsX = TESTSX;
    sendResponseBack({
        type: $scriptType,
        inMem: TEST_RUN_CONTEXT.envs.inMem,
        logs: TEST_RUN_CONTEXT.logs,
        tests: TEST_RUN_CONTEXT.tests,
        scriptError: TEST_RUN_CONTEXT.scriptError
    });
}

window.addEventListener('message', function (event) {
    onMessageReceived(event.data);
}, false);

function prepareScript(code) {
    return '(function (){\n' + code + '\n})()';
}

//Library functions
function setEnv(key, value) {
    if (!key)
        return false;
    if (!TEST_RUN_CONTEXT.envs.inMem)
        TEST_RUN_CONTEXT.envs.inMem = {};

    TEST_RUN_CONTEXT.envs.inMem = { ...TEST_RUN_CONTEXT.envs.inMem, [key]: value };
    return true;
}

function removeEnv(key) {
    if (key) {
        let { [key]: omit, ...rest } = TEST_RUN_CONTEXT.envs.inMem;
        TEST_RUN_CONTEXT.envs.inMem = rest;
    }
}
function getEnv(key) {
    return TEST_RUN_CONTEXT.envs.inMem?.[key] || TEST_RUN_CONTEXT.envs.saved?.[key]
}

//TODO: deprecate these
// function assertTrue(msg, condition) {
//     if (condition) {
//         TESTS[msg] = true;
//     } else {
//         TESTS[msg] = false;
//     }
// }

// function assertFalse(msg, condition) {
//     if (!condition) {
//         TESTS[msg] = true;
//     } else {
//         TESTS[msg] = false;
//     }
// }

function log() {
    let args = [...arguments], argsString = []

    for (let i = 0; i < args.length; i++) {
        try {
            argsString.push(JSON.stringify(args[i]));
        } catch (e) {
            argsString.push(`'Error parsing data. Could not convert to string: ${e.message}`);
        }
    }
    TEST_RUN_CONTEXT.logs.push(argsString.join(', '))
}

function validateSchema(code) {
    // @ts-ignore
    if (!Ajv) return false;

    if (code === undefined) {
        code = $response.status || undefined;
    }
    var valid = false;
    if (code !== undefined && $request.respCodes) {
        let codeStr = `${code}`;
        //code = code.toString();
        var schema = $request.respCodes.find(resp => resp.code == codeStr);

        if (!schema) return false;
        // @ts-ignore
        var a = new Ajv();
        valid = a.validate(schema.data, $response.data);
        //var validate = a.compile(schema);
        //valid = validate(reqObj.response.data);
    }
    return valid;
}

// function convertToTestX(tests) {
//     var testsX = [];
//     for (var name in tests) {
//         var test = {
//             name: name,
//             success: tests[name],
//             type: 'old'
//         }
//         if (test.success === false) {
//             test.reason = 'You have used the deprecated test method which doesn\'t report error for each test case. Use apic.test() instead.'
//         }
//         testsX.push(test)
//     }
//     return testsX;
// }