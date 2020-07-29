var accessControlRequestHeaders;
var ReqIDs = [];
var prefix = 'APIC-';


var requestListener = function (details) {
	var morphedHeaders = morphHeaders(details.requestHeaders);

	if (morphedHeaders && morphedHeaders.fromApic) {
		console.log('APIC req: found restricted header');
		delete morphedHeaders.headers.ORIGIN;

		var allHeaders = Object.keys(morphedHeaders.headers);
		for (var i = 0; i < allHeaders.length; i++) {
			var headerName = allHeaders[i];
			var headerValue = morphedHeaders.headers[headerName];
			if (headerName.indexOf(prefix) === 0) {
				var newHeaderName = headerName.substr(prefix.length);
				morphedHeaders.headers[newHeaderName] = headerValue;
				//delete the APIC- prefixed header
				delete morphedHeaders.headers[headerName];
			}
		}
		var requestHeadersArray = headersObjToArray(morphedHeaders.headers);
		return { requestHeaders: requestHeadersArray };
	} else {
		return { requestHeaders: details.requestHeaders };
	}
};

function morphHeaders(requestHeadersArray) {
	var morphedHeaders = {
		fromApic: false,
		containsCustomOriginHeader: false,
		headers: {}
	}
	for (var i = 0; i < requestHeadersArray.length; ++i) {
		var header = requestHeadersArray[i];
		header.name = header.name.toUpperCase();
		if (header.name === 'X-APIC-REQ-ID') {
			morphedHeaders.fromApic = true;
		}
		//skip origin header when sent from chrome extension
		//if(header.name === 'ORIGIN')
		morphedHeaders.headers[header.name] = header.value;
	}
	return morphedHeaders;
}

function headersObjToArray(requestHeadersObj) {
	var requestHeadersArray = [], allHeaders = Object.keys(requestHeadersObj);

	for (var i = 0; i < allHeaders.length; i++) {
		var header = { name: allHeaders[i], value: requestHeadersObj[allHeaders[i]] };
		requestHeadersArray.push(header);
	}
	return requestHeadersArray;
}

/*On install*/
//chrome.runtime.onInstalled.addListener(function(){
reload();
//});

/*Reload settings*/
function reload() {
	/*Remove Listeners*/
	//chrome.webRequest.onHeadersReceived.removeListener(responseListener);
	chrome.webRequest.onBeforeSendHeaders.removeListener(requestListener);


	//chrome.webRequest.onHeadersReceived.addListener(responseListener, {urls:['*://*/*'], types:['xmlhttprequest']},["blocking", "responseHeaders"]);
	chrome.webRequest.onBeforeSendHeaders.addListener(requestListener, { urls: ['*://*/*'], types: ['xmlhttprequest'] }, ["blocking", "requestHeaders", "extraHeaders"]);
}
