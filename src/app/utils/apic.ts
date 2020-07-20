var apic = {
    randomStr,
    randomNum,
    randomEmail,
    randomInList,
    time,
    s4,
    s8,
    s12,
    uuid,
    dataId,
    removeDemoItems,
    test,
    basicAuth
}

function randomStr(minLen: number, maxLen?: number) {
    if (minLen < 1) {
        return '';
    }

    if (maxLen !== undefined) {
        minLen = randomNum(minLen, maxLen);
    }
    return new Array(minLen).join().replace(/(.|$)/g, function () {
        return ((Math.random() * 36) | 0).toString(36)[Math.random() < .5 ? 'toString' : 'toUpperCase']();
    });
}

function randomNum(min, max, isFloat?: boolean) {
    min = min === undefined || typeof min !== 'number' ? 0 : min;
    max = max === undefined || typeof min !== 'number' ? 0 : max;

    if (isFloat) {
        return Math.random() * (max - min) + min;
    } else {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
}

function randomEmail() {
    return randomStr(5) + '.' + randomStr(4) + '@' + randomStr(4) + '.' + randomStr(3);
}

function randomInList(list: any[]) {
    if (!list || !(list.length > 0)) {
        return undefined;
    }
    var index = randomNum(0, list.length - 1);
    return list[index];
}

function time() {
    return new Date().getTime();
}

function s4() {
    return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
}

function s8() {
    return s4() + s4();
}

function s12() {
    return s4() + s4() + s4();
}

function uuid() {
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}
function dataId() {
    var prefix = '',
        possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        index = 0;

    for (index = 0; index < 3; index++) {
        prefix += possible.charAt(Math.floor(Math.random() * possible.length));
    }

    return prefix + s4() + s4();
}
function removeDemoItems(items) {
    var itemsToReturn = [];
    if (items instanceof Array) {
        for (var i = 0; i < items.length; i++) {
            if (items[i]._id.indexOf('-demo') < 0) {
                itemsToReturn.push(items[i]);
            }
        }
    } else if (items._id.indexOf('-demo') < 0) {
        itemsToReturn.push(items);
    }
    return itemsToReturn;
}

function test(name, testFn) {
    try {
        testFn();
        window['TESTSX'].push({
            name: name,
            success: true
        });
    } catch (e) {
        window['TESTSX'].push({
            name: name,
            success: false,
            reason: e.message
        });
    }
}

function basicAuth(userName, password) {
    return "Basic " + btoa(userName + ":" + password);
}

export default apic;