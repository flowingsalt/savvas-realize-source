angular.module('Realize.common.tourGuidePopover', [

    ])
    .directive('rlzTourGuidePopover', [
        function() {
            'use strict';

            return {
                link: function(scope) {
                    var target, position;

                    scope.position = {};
                    scope.arrowPosition = {};

                    scope.$watchCollection(
                        function() {
                            target = scope.params.target;
                            position = target.offset();
                            scope.arrowPosition = scope.params.arrowPosition ? scope.params.arrowPosition : '';
                            if (scope.params.toolTipPosition) {
                                if (scope.params.toolTipPosition.top) {
                                    position.top = scope.params.toolTipPosition.top;
                                }
                                if (scope.params.toolTipPosition.left) {
                                    position.left = scope.params.toolTipPosition.left;
                                }
                            }
                            return {
                                top: position.top,
                                left: position.left,
                                height: target.height(),
                                width: target.width(),
                            };
                        },
                        function(newPos) {
                            scope.position = newPos;
                        }
                    );

                }
            };
        }
    ]);
