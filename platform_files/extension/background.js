chrome.runtime.onInstalled.addListener(({ reason }) => {
    if (reason === 'install') {
        chrome.tabs.create({
            url: "index.html"
        });
    }
});

const allResourceTypes = Object.values(chrome.declarativeNetRequest.ResourceType);

chrome.runtime.onConnect.addListener(function (port) {
    console.assert(port.name === "apic_extn");
    port.onMessage.addListener(async (msg) => {
        console.log('From app', msg);
        if (msg.type === 'ADD_HEADERS') {
            let host = msg.data.host
            let rules = Object.keys(msg.data.headers).map((key, index) => {
                return {
                    id: (index + 1),
                    priority: 1,
                    action: {
                        type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
                        requestHeaders: [
                            {
                                operation: chrome.declarativeNetRequest.HeaderOperation.SET,
                                header: key,
                                value: msg.data.headers[key],
                            },
                        ]
                    },
                    condition: {
                        requestDomains: [host],
                        resourceTypes: allResourceTypes,
                    }
                }
            });
            chrome.declarativeNetRequest.updateSessionRules({
                addRules: rules
            });
            port.postMessage({status: 'OK'});
        }else if(msg.type === 'CLEAR_HEADERS'){
            let existingRules = await chrome.declarativeNetRequest.getSessionRules();
            chrome.declarativeNetRequest.updateSessionRules({
                removeRuleIds: existingRules.map(rule=>rule.id)
            });
            port.postMessage({status: 'OK'});
        }
    });
});
