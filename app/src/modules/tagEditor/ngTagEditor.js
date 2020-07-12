'use strict';

angular.module('ngTagEditor', [])
        .filter('getCol', function () {
            return function (items, row) {
                return items && items.map(function (item) {
                    return item[row];
                }).join(',');
            };
        }).directive('focusMe', ['$timeout', '$parse', function ($timeout, $parse) {
        return{
            link: function (scope, element, attrs) {
                var model = $parse(attrs.focusMe);
                scope.$watch(model, function (value) {
                    if (value === true) {
                        $timeout(function () {
                            element[0].focus();
                        });
                    }
                });
                element.bind('blur', function () {
                    //scope.$apply(model.assign(scope, false));
                });
            }
        };
    }]).directive('tagEditor', function () {
    return{
        restrict: 'AE',
        /* require: 'ngModel',*/
        scope: {
            tags: '=ngModel',
            type: '@type',
            placeholder: '@placeholder',
            suggestions: '=suggestions',
            config: '=config',
            mode: '@mode'
        },
        replace: true,
        templateUrl: 'modules/tagEditor/ngTagEditor.html',
        controller: ['$scope', '$attrs', '$element', '$http', '$filter', '$timeout', function ($scope, $attrs, $element, $http, $filter, $timeout) {

                $scope.options = [];
                $scope.options.output = $attrs.output || 'name';
                $scope.options.fetch = '';//$attrs.fetch || 'suggestions.php?q=';
                // $scope.options.placeholder = $scope.placeholder || 'Enter a few letters...';
                $scope.options.apiOnly = $attrs.apiOnly || false;
                $scope.search = '';

                /*$scope.$watch('search', function(){
                 $http.get($scope.options.fetch + $scope.search).success(function(data){
                 $scope.suggestions = data.data;
                 });
                 });*/
                $scope.add = function (id, name, selected, event) {
                    if ($scope.type === 'string') {
                        if ($scope.tags.indexOf(name) === -1) {
                            $scope.tags.push(name);
                        }
                    } else if ($scope.type === 'object') {
                        if ($scope.mode === 'strict') {
                            if (!selected) {
                                id = undefined;
                                angular.forEach($scope.suggestions, function (sug) {
                                    if (sug[$scope.config['val']].toLowerCase() === name.toLowerCase()) {
                                        id = sug[$scope.config['key']];
                                    }
                                });
                            }
                            if (id) {
                                var found = false;
                                for (var i = 0; i < $scope.tags.length; i++) {
                                    if ($scope.tags[i][$scope.config['key']] === id) {
                                        found = true;
                                        break;
                                    }
                                }
                                if (!found) {
                                    var obj = {};
                                    obj[$scope.config['key']] = id;
                                    obj[$scope.config['val']] = name;
                                    $scope.tags.push(obj);
                                    $scope.$emit('tagAdded',obj);
                                }
                            }
                        } else {
                            //TODO
                        }
                        if(event){
                            angular.element(event.currentTarget).parents('.tag-editor').find('.tag-input').focus();
                        }
                    } else {
                        var obj = {};
                        obj[$scope.config['key']] = id;
                        obj[$scope.config['val']] = name;
                        $scope.tags.push(obj);
                    }
                    $scope.search = '';
                };
                $scope.remove = function (index) {
                    var removed = $scope.tags.splice(index, 1);
                    if($scope.mode === 'strict' && $scope.type === 'object'){
                        $scope.$emit('tagRemoved',removed[0]);
                    }
                };

                $element.find('input').on('keydown', function (e) {
                    var keys = [8, 13];
                    if (keys.indexOf(e.which) !== -1) {
                        if (e.which == 8) { /* backspace */
                            if ($scope.search.length === 0 && $scope.tags.length) {
                                $scope.tags.pop();
                                e.preventDefault();
                            }
                        }
                        else if (e.which == 32 || e.which == 13) { /* space & enter */
                            if ($scope.search.length && !$scope.apiOnly) {
                                if (!$scope.apiOnly) {
                                    $scope.add(0, $scope.search);
                                    e.preventDefault();
                                }
                            }
                        }
                        $scope.$apply();
                    }
                });

            }]
    };
});
