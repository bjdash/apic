var id = chrome.app.getDetails().id;
var htmlPage = "/index.html";
var createNewTab = true;

chrome.windows.getCurrent(function (currentWindow) {
    var tabWindows = chrome.extension.getViews({
            type: "tab",
            windowId: currentWindow.id
        });
    if(tabWindows){
        tabWindows.forEach(function (tabWindow) {
            if (tabWindow.location.hostname === id && createNewTab) {
                createNewTab = false;
                chrome.tabs.update(tabWindow.chromeTabId, {
                    active: true
                });
                window.close();
            }
        });
    }
    if (createNewTab) {
        try{
            chrome.tabs.create({
                url: chrome.runtime.getURL(htmlPage)
            });
        }catch(e){
            browser.tabs.create({
                url: chrome.runtime.getURL(htmlPage),
                active:true
            });
            
        }
    }

});
