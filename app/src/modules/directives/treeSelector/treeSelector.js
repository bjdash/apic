angular
        .module('apic')
        .directive('treeSelector', treeSelector);

treeSelector.$inject = ['$rootScope'];
function treeSelector($rootScope) {
    return{
        restrict: 'A',
        require: 'ngModel',
        scope: {
            items: '=items',
            displayName: '=displayName',
            tree: '=tree',
            children: '=children',
            disableParent: '=disableParent'
        },
        templateUrl: 'modules/directives/treeSelector/treeSelector.html',
        link: function (scope, ele, attr, model) {
            if (scope.items && scope.items.length) {
                scope.type = 'array';
            } else {
                scope.type = 'object';
            }
            scope.model = model;
            scope.selectedId = '';
            scope.done = function () {
                $rootScope.$emit('treeSelected', {selectedVal: scope.model.$viewValue});
            };
            scope.select = function (node) {
                scope.model.$setViewValue(node._id);
            };
        }
    };
}
