chrome.runtime.onInstalled.addListener(({ reason }) => {
    if (reason === 'install') {
        chrome.tabs.create({
            url: "index.html"
        });
    }
});

chrome.runtime.onConnect.addListener(function (port) {
    console.assert(port.name === "apic_extn");
    port.onMessage.addListener(async (msg) => {
        console.log('From app', msg);
        if (msg.type === 'ADD_HEADERS') {
            let rules = Object.keys(msg.data).map((key, index) => {
                return {
                    id: (index + 1),
                    priority: 1,
                    action: {
                        type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
                        requestHeaders: [
                            {
                                operation: chrome.declarativeNetRequest.HeaderOperation.SET,
                                header: key,
                                value: msg.data[key],
                            },
                        ]
                    },
                    condition: {
                        requestDomains: ['apic.apps', 'postman-echo.com'],
                        resourceTypes: allResourceTypes,
                    }
                }
            });
            chrome.declarativeNetRequest.updateSessionRules({
                addRules: rules
            });
            port.postMessage({status: 'OK'});
        }else if(msg.type === 'CLEAR_HEADERS'){
            let existingRules = await chrome.declarativeNetRequest.getDynamicRules()
            chrome.declarativeNetRequest.updateSessionRules({
                removeRuleIds: existingRules.map(rule=>rule.id)
            });
            port.postMessage({status: 'OK'});
        }
    });
});


const allResourceTypes = Object.values(chrome.declarativeNetRequest.ResourceType);
// chrome.storage.onChanged.addListener(
//     function (changes, areaName) {
//         console.log(changes, areaName);
//         let rules = [];
//         if (areaName === 'session') {
//             let headers = changes.restrictedHeaders.newValue;
//             rules = Object.keys(headers).map((key, index) => {
//                 return {
//                     id: (index + 1),
//                     priority: 1,
//                     action: {
//                         type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
//                         requestHeaders: [
//                             {
//                                 operation: chrome.declarativeNetRequest.HeaderOperation.SET,
//                                 header: key,
//                                 value: headers[key],
//                             },
//                         ]
//                     },
//                     condition: {
//                         requestDomains: ['apic.apps', 'postman-echo.com'],
//                         resourceTypes: allResourceTypes,
//                     }
//                 }
//             })
//         }
//         chrome.declarativeNetRequest.updateSessionRules({
//             addRules: rules
//         })
//     }
// )
// var accessControlRequestHeaders;
// var ReqIDs = [];
// var prefix = 'APIC-';


// var requestListener = function (details) {
// 	var morphedHeaders = morphHeaders(details.requestHeaders);

// 	if (morphedHeaders && morphedHeaders.fromApic) {
// 		console.log('APIC req: found restricted header');
// 		delete morphedHeaders.headers.ORIGIN;

// 		var allHeaders = Object.keys(morphedHeaders.headers);
// 		for (var i = 0; i < allHeaders.length; i++) {
// 			var headerName = allHeaders[i];
// 			var headerValue = morphedHeaders.headers[headerName];
// 			if (headerName.indexOf(prefix) === 0) {
// 				var newHeaderName = headerName.substr(prefix.length);
// 				morphedHeaders.headers[newHeaderName] = headerValue;
// 				//delete the APIC- prefixed header
// 				delete morphedHeaders.headers[headerName];
// 			}
// 		}
// 		var requestHeadersArray = headersObjToArray(morphedHeaders.headers);
// 		return { requestHeaders: requestHeadersArray };
// 	} else {
// 		return { requestHeaders: details.requestHeaders };
// 	}
// };

// function morphHeaders(requestHeadersArray) {
// 	var morphedHeaders = {
// 		fromApic: false,
// 		containsCustomOriginHeader: false,
// 		headers: {}
// 	}
// 	for (var i = 0; i < requestHeadersArray.length; ++i) {
// 		var header = requestHeadersArray[i];
// 		header.name = header.name.toUpperCase();
// 		if (header.name === 'X-APIC-REQ-ID') {
// 			morphedHeaders.fromApic = true;
// 		}
// 		//skip origin header when sent from chrome extension
// 		//if(header.name === 'ORIGIN')
// 		morphedHeaders.headers[header.name] = header.value;
// 	}
// 	return morphedHeaders;
// }

// function headersObjToArray(requestHeadersObj) {
// 	var requestHeadersArray = [], allHeaders = Object.keys(requestHeadersObj);

// 	for (var i = 0; i < allHeaders.length; i++) {
// 		var header = { name: allHeaders[i], value: requestHeadersObj[allHeaders[i]] };
// 		requestHeadersArray.push(header);
// 	}
// 	return requestHeadersArray;
// }

// /*On install*/
// //chrome.runtime.onInstalled.addListener(function(){
// reload();
// //});

// /*Reload settings*/
// function reload() {
// 	/*Remove Listeners*/
// 	//chrome.webRequest.onHeadersReceived.removeListener(responseListener);
// 	chrome.webRequest.onBeforeSendHeaders.removeListener(requestListener);


// 	//chrome.webRequest.onHeadersReceived.addListener(responseListener, {urls:['*://*/*'], types:['xmlhttprequest']},["blocking", "responseHeaders"]);
// 	chrome.webRequest.onBeforeSendHeaders.addListener(requestListener, { urls: ['*://*/*'], types: ['xmlhttprequest'] }, ["blocking", "requestHeaders", "extraHeaders"]);
// }
