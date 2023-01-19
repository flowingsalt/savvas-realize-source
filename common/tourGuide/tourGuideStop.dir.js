angular.module('Realize.common.tourGuideStop', [
        'Realize.common.tourGuide',
        'ModalServices'
    ])
    .directive('rlzTourGuideStop', [
        function() {
            'use strict';

            return {
                require: '^rlzTourGuide',
                scope: {
                    activeStop: '=rlzTourGuideStop',
                    content: '=content',
                    order: '=',
                    target: '@?',
                    toolTipPosition: '<?',
                    arrowPosition: '<?'
                },
                link: function(scope, elm, attr, tourGuideCtrl) {
                    tourGuideCtrl.addStep(scope.order);

                    scope.$watch('activeStop', function(newVal) {
                        var isActive = (newVal === scope.order),
                            element = scope.target ? elm.find(scope.target) : elm;

                        if (isActive) {
                            tourGuideCtrl.show(element, scope.order, scope.content,
                                scope.toolTipPosition, scope.arrowPosition);
                        }
                    });
                }
            };
        }
    ]);
