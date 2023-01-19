angular.module('Realize.common.tourGuide', [
        'Realize.common.tourGuideStop',
        'Realize.common.tourGuidePopover',
        'ModalServices'
    ])
    .directive('rlzTourGuide', [
        function() {
            'use strict';

            return {
                controller: [
                    '$scope',
                    'Modal',
                    function($scope, Modal) {

                        var ctrl = this,
                            modalScope,
                            modalTemplateUrl = 'templates/common/tourGuide/tourGuidePopover.html';

                        this.stops = [];

                        this.activeStop = null;

                        this.next = function() {
                            var next = ctrl.activeStop + 1;
                            if (next <= ctrl.stops.length) {
                                ctrl.activeStop = next;
                                $scope.$emit('tour:change', {stop: ctrl.activeStop});
                            }
                            $scope.$emit('tour:next', {stop: ctrl.activeStop});
                        };

                        this.previous = function() {
                            var previous = ctrl.activeStop - 1;
                            if (previous > 0) {
                                ctrl.activeStop = previous;
                                $scope.$emit('tour:change', {stop: ctrl.activeStop});
                            }
                            $scope.$emit('tour:previous', {stop: ctrl.activeStop});
                        };

                        this.reset = function() {
                            ctrl.activeStop = null;
                            $scope.$emit('tour:close', {stop: ctrl.activeStop});
                        };

                        this.start = function(beginAt) {
                            ctrl.activeStop = beginAt || 1;
                            $scope.$emit('tour:start', {stop: ctrl.activeStop});
                        };

                        this.addStep = function(order) {
                            ctrl.stops.push(order);
                            return order;
                        };

                        this.show = function(element, order, content, toolTipPosition, arrowPositionValue) {
                            if (!modalScope) {
                                modalScope = $scope.$new();
                                modalScope.$on('modal:close', function() {
                                    modalScope.close();
                                });
                                modalScope.close = function() {
                                    ctrl.reset();
                                    Modal.hideDialog().then(function() {
                                        modalScope.$destroy();
                                        modalScope = null;
                                    });
                                };

                                Modal.showDialog(modalTemplateUrl, modalScope);
                            }

                            modalScope.params = {
                                target: element,
                                content: content,
                                step: order,
                                total: ctrl.stops.length,
                                toolTipPosition: toolTipPosition,
                                arrowPosition: arrowPositionValue,
                            };

                            $scope.setHighlight(element);
                        };

                    }
                ],
                controllerAs: 'tourGuide',
                link: function(scope, guideElement) {
                    scope.setHighlight = function(stopElement) {
                        guideElement.find('.tour-guide-stop').removeClass('tour-guide-stop');
                        if (stopElement) {
                            stopElement.addClass('tour-guide-stop');
                        }
                    };

                    scope.$watch('tourGuide.activeStop', function(newVal) {
                        if (!newVal) {
                            scope.setHighlight();
                        }
                    });
                }
            };
        }
    ]);
