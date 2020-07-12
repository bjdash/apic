/* global chrome, FileReader */

(function () {
    //'use strict';

    angular
            .module('apic')
            .factory('FileSystem', FileSystem);

    FileSystem.$inject = ['toastr', '$q'];
    function FileSystem(toastr, $q) {
        var service = {
            download: downloadFile,
            readFile: readFile
        };

        function downloadFile(fileName, data, type, errorCallback, successCallback) {
            if (!fileName || !data){
                return;
            }
            if (!errorCallback) {
                errorCallback = function () {
                    toastr.error('Error downloading file');
                };
            }
            if (!type) {
                type = 'text/plain';
            }

            try {
                chrome.fileSystem.chooseEntry(
                        {type: 'saveFile', suggestedName: fileName},
                        function (writableFileEntry) {
                            if (!writableFileEntry) {
                                return;
                            }
                            writableFileEntry.createWriter(function (writer) {
                                var truncated = false;
                                writer.onerror = errorCallback;
                                //writer.onwriteend = successCallback;
                                writer.onwriteend = function (e) {
                                    if (!truncated) {
                                        truncated = true;
                                        //toastr.success('Error downloading file');
                                        e.currentTarget.truncate(e.currentTarget.position);
                                        if (successCallback) {
                                            successCallback(e);
                                        }
                                    }

                                };


                                var blob = new Blob([data], {type: type});
                                writer.write(blob);
                            }, errorCallback);
                        });
            } catch (e) {
                if (type === 'text/plain') {
                    var dataStr = 'data:text/json;charset=utf-8;base64,' + btoa(data);
                    var dlAnchorElem = document.createElement('a');
                    dlAnchorElem.setAttribute('href', dataStr);
                    dlAnchorElem.setAttribute('download', fileName);
                    //document.body.appendChild(dlAnchorElem);
                    dlAnchorElem.click();
                    //document.body.removeChild(dlAnchorElem);
                    if (successCallback) {
                        successCallback(e);
                    }
                } else {
                    toastr.warning('The specified file type ' + type + ' is not suppoterd till now.');
                }
            }
        }

        function readFile(file, errorHandler, onSuccess) {
            var d = $q.defer();
            if (!errorHandler) {
                errorHandler = function () {
                    toastr.error('Error reading file');
                    d.reject('Error reading file');
                };
            }


            try {
                chrome.fileSystem.chooseEntry({type: 'openFile'}, function (readOnlyEntry) {
                    readOnlyEntry.file(function (file) {
                        var reader = new FileReader();

                        reader.onerror = errorHandler;

                        reader.onloadend = function (e) {
                            var file = {
                                data: e.target.result,
                                size: e.total
                            };
                            d.resolve(file);
                        };

                        var data = reader.readAsText(file);
                    });
                });
            } catch (e) {
                if(!file){
                    var x = document.createElement('INPUT');
                    x.setAttribute('type', 'file');
                    //document.body.appendChild(x);
                    x.onchange = function () {
                        var files = this.files;
                        onChangeHandler(files);

                    };
                    x.click();
                }else{
                    onChangeHandler(file);
                }
                
                function onChangeHandler(files){
                    if (!files.length) {
                            toastr.error('Please select a file!');
                            d.reject('Please select a file!');
                        }

                        var file = files[0], start = 0, stop = file.size - 1;
                        var reader = new FileReader();

                        reader.onerror = errorHandler;
                        reader.onloadend = function (e) {
                            if (e.target.readyState === FileReader.DONE) { // DONE == 2
                                var readData = {
                                    data: e.target.result,
                                    size: e.total
                                };
                                d.resolve(readData);
                            }
                        };

                        var blob = file.slice(start, stop + 1);
                        reader.readAsBinaryString(blob);
                }
            }

            return d.promise;
        }

        return service;
    }
})();