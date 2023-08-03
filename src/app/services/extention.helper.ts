declare const chrome;
export default class ExtentionHelper {
    static portName = 'apic_extn';
    static port;
    static resolve;
    static reject;

    static connect() {
        this.port = chrome.runtime.connect({ name: this.portName });
        console.log('Service worker port connected.')
        this.port.onMessage.addListener((msg) => {
            if(! msg.error){this.resolve()}
            else(this.reject(msg))
        });

        this.port.onDisconnect.addListener(()=>{
            console.log('Extention service worker port disconnected. Reconnecting..')
            this.connect()
        })
    }

    static async addRestrictedHeaders(headers:{ [key: string]: string }, host:string){
        // chrome.storage.session.set({headers});
        return new Promise((resolve, reject)=>{
            this.resolve = resolve;
            this.reject = reject;
            this.port.postMessage({type: 'ADD_HEADERS',  data: {headers, host}});
        })
    }

    static async clearRestrictedHeaders(){
        return new Promise((resolve, reject)=>{
            this.resolve = resolve;
            this.reject = reject;
            this.port.postMessage({type: 'CLEAR_HEADERS'});
        })
    }
}