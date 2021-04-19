

var from, type, code, reqObj, $response, $request, $env, TESTS, TESTSX;

function sendResponseBack(msg, type) {
    msg.$type = type;
    window.parent.postMessage(msg, '*');
}

/* data
 * fields{
 *  type : type if script, prescript or postscript,
 * }
 */
function onMessageReceived(data) {
    console.log('received test script', data);
    reqObj = data.req;
    type = data.type;
    //code = data.type === 'prescript' ? data.req.prescript : data.req.postscript;
    code = data.req[data.type];
    code = prepareScript(code);
    $response = data.req.response;
    $request = data.req.request;
    $env = {}

    TESTS = {};
    TESTSX = [];
    try {
        eval(code);
    } catch (e) {
        console.log('error', e);
        reqObj.testError = e.toString();
    }
    reqObj.tests = TESTSX.concat(convertToTestX(TESTS));
    // reqObj.testsX = TESTSX;
    sendResponseBack(reqObj, data.type);
}

window.addEventListener('message', function (event) {
    onMessageReceived(event.data);
    from = event.source;
}, false);

function prepareScript(code) {
    if (!code)
        return false;
    return '(function (){\n' + code + '\n})()';
}

//Library functions
function setEnv(key, value) {
    if (!key)
        return false;
    if (!reqObj.xtraEnv)
        reqObj.xtraEnv = {};
    //if(!reqObj.xtraEnv.vals) reqObj.xtraEnv.vals = {};

    reqObj.xtraEnv[key] = value;
    return true;
}

function removeEnv(key) {
    if (key && reqObj && reqObj.env && reqObj.env.vals) {
        delete reqObj.env.vals[key];
    }
}
function getEnv(key) {
    if (key && reqObj && reqObj.env && reqObj.env.vals) {
        return reqObj.env.vals[key];
    }
}

//TODO: deprecate these
function assertTrue(msg, condition) {
    if (condition) {
        TESTS[msg] = true;
    } else {
        TESTS[msg] = false;
    }
}

function assertFalse(msg, condition) {
    if (!condition) {
        TESTS[msg] = true;
    } else {
        TESTS[msg] = false;
    }
}

function log(data) {
    if (!data)
        return;
    var delim = '\n';
    if (!reqObj.logs) {
        reqObj.logs = '';
        delim = '';
    }
    try {
        reqObj.logs += delim + JSON.stringify(data);
    } catch (e) {
        reqObj.logs += delim + 'Error parsing data. COuld not convert to string';
    }
}

function validateSchema(code) {
    if (!Ajv) return false;

    if (code === undefined) {
        code = reqObj.response.status || undefined;
    }
    var valid = false;
    if (code !== undefined && reqObj.respCodes) {
        //code = code.toString();
        var schema;
        for (var i = 0; i < reqObj.respCodes.length; i++) {
            if (reqObj.respCodes[i].code == code) {
                schema = reqObj.respCodes[i].data;
                break;
            }
        }
        if (!schema) return false;
        var a = new Ajv();
        valid = a.validate(schema, reqObj.response.data);
        //var validate = a.compile(schema);
        //valid = validate(reqObj.response.data);
    }
    return valid;
}

function convertToTestX(tests) {
    var testsX = [];
    for (var name in tests) {
        var test = {
            name: name,
            success: tests[name],
            type: 'old'
        }
        if (test.success === false) {
            test.reason = 'You have used the deprecated test method which doesn\'t report error for each test case. Use apic.test() instead.'
        }
        testsX.push(test)
    }
    return testsX;
}