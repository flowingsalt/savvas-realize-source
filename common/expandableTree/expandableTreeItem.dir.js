angular.module('Realize.common.expandableTreeItemDirective', [])
.directive('expandableTreeItem', [
    '$log',
    '$compile',
    function($log, $compile) {
        'use strict';

        return {
            scope: false,
            restrict: 'A',
            controller: [
                '$log',
                '$scope',
                function($log, $scope) {
                    $scope.obj.expanded = false;
                    $scope.click = function(event) {
                        $scope.obj.expanded = $scope.hasChildren ? !$scope.obj.expanded : $scope.obj.expanded;
                        $scope.$emit('expandableTreeItem.leftTreeControl.clicked', event);
                    };
                }
            ],
            link: function(scope, element) {
                var level = scope.level + 1,
                    hasChildren = false;

                if (scope.obj[scope.childProperty]) {
                    hasChildren = scope.obj[scope.childProperty].length > 0 && level < scope.levels;
                }

                scope.hasChildren = hasChildren;
                if (hasChildren) {
                    /* jscs:disable maximumLineLength */
                    var tree = $compile('<ul expandable-tree visible="obj.expanded" levels="levels" level="level + 1" list="obj[childProperty]" child-property="children" template="template" open="open" show-check-box="showCheckBox" container="container"></ul>')(scope);
                    /* jscs:enable maximumLineLength */
                    element.append(tree);
                }

                scope.selectCheckboxWrapper = function() {
                    scope.obj.selected = !scope.obj.selected;
                    scope.$emit('expandableTreeItem.selectCheckbox.select', scope.obj);
                };

                scope.selectCheckbox = function(id, isChecked) {
                    scope.obj.selected = isChecked;
                    scope.$emit('expandableTreeItem.selectCheckbox.select', scope.obj, id);
                };

                scope.showNoToggleTreeControl = function(treeItem) {
                    return angular.isDefined(treeItem.showNoToggleControl) ?
                        treeItem.showNoToggleControl : !scope.hasChildren;
                };
            }
        };
    }
]);
