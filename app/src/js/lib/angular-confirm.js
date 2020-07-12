/*
 * angular-confirm
 * https://github.com/Schlogen/angular-confirm
 * @version v1.2.3 - 2016-01-26
 * @license Apache
 */
(function (root, factory) {
    'use strict';
    if (typeof define === 'function' && define.amd) {
        define(['angular'], factory);
    } else if (typeof module !== 'undefined' && typeof module.exports === 'object') {
        module.exports = factory(require('angular'));
    } else {
        return factory(root.angular);
    }
}(this, function (angular) {
    angular.module('angular-confirm', ['ui.bootstrap.modal'])
            .controller('ConfirmModalController',ConfirmModalController)
            .value('$confirmModalDefaults', {
                template: '<div class="modal-header"><h4 style="color:#F44336" class="modal-title">{{data.title}}</h4></div>' +
                        '<div class="modal-body" style="font-size: 16px;padding: 0 15px;">{{data.text}}</div>' +
                        '<div class="modal-footer" style="padding:0 15px 15px">' +
                        '<button class="btn btn-sm btn-danger" ng-click="ok()">{{data.ok}}</button>' +
                        '<button class="btn btn-sm btn-link" ng-click="cancel()" ng-if="data.type !== \'alert\' ">{{data.cancel}}</button>' +
                        '</div>',
                controller: 'ConfirmModalController',
                defaultLabels: {
                    title: 'Confirm',
                    ok: 'OK',
                    cancel: 'Cancel',
                    type:'confirm'
                }
            })
            .factory('$confirm', confirmFactory)
            .directive('confirm', confirmDirective);
            
    ConfirmModalController.$inject = ['$scope', '$uibModalInstance', 'data'];
    function  ConfirmModalController ($scope, $uibModalInstance, data) {
        $scope.data = angular.copy(data);

        $scope.ok = function (closeMessage) {
            $uibModalInstance.close(closeMessage);
        };

        $scope.cancel = function (dismissMessage) {
            if (angular.isUndefined(dismissMessage)) {
                dismissMessage = 'cancel';
            }
            $uibModalInstance.dismiss(dismissMessage);
        };

    }
    
    confirmFactory.$inject = ['$uibModal', '$confirmModalDefaults'];
    function confirmFactory($uibModal, $confirmModalDefaults) {
        return function (data, settings) {
            var defaults = angular.copy($confirmModalDefaults);
            settings = angular.extend(defaults, (settings || {}));

            data = angular.extend({}, settings.defaultLabels, data || {});

            if ('templateUrl' in settings && 'template' in settings) {
                delete settings.template;
            }

            settings.resolve = {
                data: function () {
                    return data;
                }
            };

            return $uibModal.open(settings).result;
        };
    }
    
    confirmDirective.$inject = ['$confirm'];
    function confirmDirective($confirm) {
        return {
            priority: 1,
            restrict: 'A',
            scope: {
                confirmIf: "=",
                ngClick: '&',
                confirm: '@',
                confirmSettings: "=",
                confirmTitle: '@',
                confirmOk: '@',
                confirmCancel: '@'
            },
            link: function (scope, element, attrs) {

                element.unbind("click").bind("click", function ($event) {

                    $event.preventDefault();

                    if (angular.isUndefined(scope.confirmIf) || scope.confirmIf) {

                        var data = {text: scope.confirm};
                        if (scope.confirmTitle) {
                            data.title = scope.confirmTitle;
                        }
                        if (scope.confirmOk) {
                            data.ok = scope.confirmOk;
                        }
                        if (scope.confirmCancel) {
                            data.cancel = scope.confirmCancel;
                        }
                        $confirm(data, scope.confirmSettings || {}).then(scope.ngClick);
                    } else {

                        scope.$apply(scope.ngClick);
                    }
                });

            }
        };
    }
}));
