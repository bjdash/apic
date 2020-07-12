(function () {
    function _trackInstalling(worker) {
        worker.addEventListener('statechange', function() {
            if (worker.state == 'installed') {
                if(confirm(updateMsg)){
                    worker.postMessage({action: 'skipWaiting'});
                }
            }
        });
    }
    var updateMsg = 'APIC has found a new update. Would you loke to reload?'
    if(navigator.serviceWorker){
        navigator.serviceWorker.register('/online/sw.js').then(function(reg) {
            if (!navigator.serviceWorker.controller) {
                return;
            }
    
            if (reg.waiting) {
                if(confirm(updateMsg)){
                    reg.waiting.postMessage({action: 'skipWaiting'});
                }
                return;
            }
            if (reg.installing) {
                _trackInstalling(reg.installing);
                return;
            }
    
            reg.addEventListener('updatefound', function() {
                _trackInstalling(reg.installing);
            });
        });
        navigator.serviceWorker.addEventListener('controllerchange', function() {
            window.location.reload();
        });
    }
})();
