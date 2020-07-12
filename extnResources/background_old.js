var accessControlRequestHeaders;
var ReqIDs = [];
var prefix = 'APIC-'


var requestListener = function(details){
    var isFromAPIC = false;
	var requestHeadersObj = headersArrayToObj(details.requestHeaders);
	if(requestHeadersObj){
		console.log('APIC req: found restricted header');
		var allHeaders = Object.keys(requestHeadersObj);
		for(var i=0; i<allHeaders.length; i++){
			var headerName = allHeaders[i];
			var headerValue = requestHeadersObj[headerName];
			if(headerName.indexOf(prefix)>=0){
				headerName = headerName.substr(prefix.length);
				requestHeadersObj[headerName] = headerValue;
			}
		}	
		var requestHeadersArray = headersObjToArray(requestHeadersObj);
		return {requestHeaders: requestHeadersArray};
	}else{
		return {requestHeaders: details.requestHeaders};
	}
};

function headersArrayToObj(requestHeadersArray){
	var requestHeadersObj = {}, isFromAPIC = false;
	for (i = 0; i < requestHeadersArray.length; ++i) {
		var header = requestHeadersArray[i];
		header.name = header.name.toUpperCase();
		if(header.name.indexOf(prefix)===0){
			isFromAPIC = true;
		}
		requestHeadersObj[header.name] = header.value;
	}
	if(isFromAPIC){
		return requestHeadersObj;
	}else{
		return false
	}
}

function headersObjToArray(requestHeadersObj){
	var requestHeadersArray=[], allHeaders = Object.keys(requestHeadersObj);
	
	for(var i=0; i<allHeaders.length; i++){
		var header = {name: allHeaders[i], value: requestHeadersObj[allHeaders[i]]};
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
	chrome.webRequest.onBeforeSendHeaders.addListener(requestListener, {urls:['*://*/*'], types:['xmlhttprequest']},["blocking", "requestHeaders"]);
}
