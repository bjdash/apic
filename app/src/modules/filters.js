(function () {
    'use strict';
    angular
            .module('apic')
            .filter('objFilterOfArray', objFilterOfArray)
            .filter('objFilter', objFilter)
            .filter('trust', trust);


    function objFilterOfArray() {
        return function (input, search, field) {
            if (!input || !search || !field){
                return input;
            }
            search = search.toLowerCase();
            var result = {};
            angular.forEach(input, function (value, key) {
                result[key] = [];
                if (value && value.length !== undefined) {
                    for (var i = 0; i < value.length; i++) {
                        var ip = value[i];
                        var actual = ('' + ip[field]).toLowerCase();
                        if (actual.indexOf(search) !== -1) {
                            result[key].push(value[i]);
                        }
                    }
                }
            });
            return result;
        };
    }

    function objFilter() {
        return function (input, search, field) {
            if (!input || !search || !field){
                return input;
            }
            search = search.toLowerCase();
            var result = [];
            angular.forEach(input, function (value, key) {
                //angular.forEach(value, function (value2, key2) {
                    if (value[field].toLowerCase().indexOf(search) !== -1) {
                        result.push(value);
                    }
                //})
            });
            console.log(result);
            return result;
        };
    }

    trust.$inject = ['$sce'];
    function trust($sce) {
        return function (input, type) {
            if (typeof input === 'string') {
                return $sce.trustAs(type || 'html', input);
            } else {
                return $sce.trustAs(type || 'html', input.toString());
            }
        };
    }

})();