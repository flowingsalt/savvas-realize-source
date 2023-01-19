angular.module('Realize.common.itemListDirective', [
    'Realize.paths'
])
    .directive('itemList', [
        'PATH',
        function(PATH) {
            'use strict';

            return {
                scope: {
                    items: '=',
                    showRemoveIcon: '=?'
                },
                restrict: 'EA',
                templateUrl: PATH.TEMPLATE_ROOT + '/common/itemList/itemList.dir.html',
                link: function(scope) {
                    if (angular.isUndefined(scope.showRemoveIcon)) {
                        scope.showRemoveIcon = true;
                    }
                    scope.removeItem = function(item) {
                        scope.$emit('itemListDirective.removeItem', item);
                    };
                }
            };
        }
    ]);
