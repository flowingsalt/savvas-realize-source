angular.module('Realize.reporting.data.masteryStandardPointer', [])
    .directive('masteryStandardPointer', [
        function() {
            'use strict';

            return {
                restrict: 'A',
                scope: {
                    standard: '=masteryStandardPointer',
                    parentSelector: '@parentSelector',
                    columnSelector: '@columnSelector'
                },
                link: function(scope, element) {
                    var emptyOffset = {left: 0},
                        parent = angular.element(scope.parentSelector),
                        parentOffset = parent.outerWidth() + (parent.offset() || emptyOffset).left,
                        selectedColumn,
                        selectedColumnleft,
                        position,
                        sizeOffset = (element.outerWidth() / 2) + 2;

                    scope.$watch('standard', function(standard) {
                        setTimeout(function() {
                            if (standard) {
                                selectedColumn = angular.element(scope.columnSelector);
                                selectedColumnleft = (selectedColumn.offset() || emptyOffset).left;
                                position = parentOffset - selectedColumnleft;
                                element.css('right', Math.floor(position - (selectedColumn.outerWidth() / 2) -
                                    sizeOffset));
                            }
                        }, 0);
                    });
                }
            };
        }
    ]);
