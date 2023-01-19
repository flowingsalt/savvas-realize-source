angular.module('Realize.common.expandableTreeDirective', [
    'Realize.common.expandableTreeItemDirective',
    'Realize.paths'
])
.directive('expandableTree', [
    'PATH',
    function(PATH) {
        'use strict';

        return {
            scope: {
                levels: '=',
                level: '=',
                template: '=',
                list: '=',
                childProperty: '@',
                visible: '=?',
                showCheckBox: '=?',
                container: '=?'
            },
            replace: true,
            templateUrl: PATH.TEMPLATE_ROOT + '/common/expandableTree/expandableTree.dir.html',
            link: function(scope) {
                scope.showCheckBoxTreeControl = function(treeItem) {
                    if ((!angular.isDefined(scope.showCheckBox)) ||
                        (angular.isDefined(treeItem.isEmptyChildList) && treeItem.isEmptyChildList) ||
                        (angular.isDefined(treeItem.count) && treeItem.count === 0)) {
                        return false;
                    } else {
                        return scope.showCheckBox;
                    }
                };
            }
        };
    }
]);
