chrome.app.runtime.onLaunched.addListener(function (launchData) {

    chrome.system.display.getInfo(function (info) {
        var width = info[0].workArea.width,
            height = info[0].workArea.height,
            openedWindows;

        if (width > 1400 && height > 800) {
            width = 1400;
            height = 800;
        }

        openedWindows = chrome.app.window.getAll();
        console.log(openedWindows)
        
        function launchApp(theme){
            console.log(theme);
            if(!theme){
                theme = "#2196F3";
            }
            chrome.app.window.create('src/index.html#/apic/home?color='+encodeURIComponent(theme), {
                "id": "apic-app",
                "bounds": {
                    width: width,
                    height: height
                },
                "outerBounds": {
                    width: width,
                    height: height
                },
                "frame":{color:'#e1e1e1'},
                //"none",
                //"state":"fullscreen"
            },
            function(win) {
                win.onClosed.addListener(function () {
                    console.log("On closing the window");
                });
            });
        }
        if (openedWindows.length === 0) {
            // Open the app in new window
            chrome.storage.sync.get(['theme'],function(data){
                console.log(data);
                launchApp(data.theme);
            });
            
        }else{
            console.log(openedWindows);
        }
    });
});
