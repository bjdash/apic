import { ApiProject } from 'src/app/models/ApiProject.model';
import { Env } from './../models/Envs.model';
import { Injectable } from "@angular/core";

@Injectable()
export class FileSystem {
    constructor() {

    }

    downloadEnv(env: Env) {
        var data = {
            TYPE: 'Environment',
            value: env
        };
        var name = env.name ? env.name : 'Environments';
        this.download(name + '.env.apic.json', JSON.stringify(data, null, '\t'))
    }

    download(fileName, data) {
        if (!fileName || !data) {
            return;
        }

        var dataStr = 'data:text/json;charset=utf-8;base64,' + btoa(data);
        var dlAnchorElem = document.createElement('a');
        dlAnchorElem.setAttribute('href', dataStr);
        dlAnchorElem.setAttribute('download', fileName);
        //document.body.appendChild(dlAnchorElem);
        dlAnchorElem.click();
    }

    readFile(file?: any) {
        return new Promise(resolve => {
            if (!file) {
                var input: HTMLElement = document.createElement('INPUT');
                input.setAttribute('type', 'file');
                input.onchange = () => {
                    var files = (<HTMLInputElement>input).files;
                    this.onFileSelected(files, resolve);
                };
                input.click();
            } else {
                this.onFileSelected(file, resolve);
            }
        })

    }
    onFileSelected(files, resolve) {
        var file = files[0], start = 0, stop = file.size - 1;
        var reader = new FileReader();

        reader.onloadend = function (e) {
            if (e.target.readyState === FileReader.DONE) { // DONE == 2
                var readData = {
                    data: e.target.result,
                    size: e.total
                };
                resolve(readData);
            }
        };

        var blob = file.slice(start, stop + 1);
        reader.readAsBinaryString(blob);
    }
}