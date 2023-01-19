angular.module('Realize.common.popOverComponent', [
        'Realize.paths'
    ])
    .directive('realizePopOver', [
        'PATH',
        function(PATH) {
            'use strict';
            return {
                restrict: 'A',
                templateUrl: PATH.TEMPLATE_ROOT + '/common/popOverComponent/popOverComponent.dir.html',
                link: function(scope, element, attrs) {
                    var $popover = element.find('.popover').first(),
                        $parentElement = element.prev(),
                        $wrapperDom = attrs.wrapperDom,
                        $documentElement = angular.element(document),
                        $nonActivitiesElement = angular.element(':focusable:not(.target):not(#pageWrap)');

                    function stopEventPropagation(e) {
                        //stops background hide from executing when clicking inside the popover
                        e.stopPropagation();
                    }

                    function hideAllPopOvers() {
                        $($wrapperDom).find('.popover').hide();
                    }

                    function hidePopOver() {
                        // todo - replace jquery hide with equivalent angular animate/css
                        $popover.hide();
                    }

                    function showPopOver() {
                        // todo - replace jquery show with equivalent angular animate/css
                        $popover.show();
                    }

                    function openPopOver(e) {
                        var positionToSubstract;
                        e.stopPropagation(); //stops background hide from executing
                        //one popover is opened at a time
                        hideAllPopOvers();
                        if (attrs.totalTasks === '0') {
                            positionToSubstract = 72;
                        } else {
                            positionToSubstract = 92;
                        }
                        showPopOver();
                        $popover.css('top' , ($parentElement.position().top - positionToSubstract) + 'px');
                    }

                    if (attrs.recommendation === 'false') {
                        scope.popOverContent = scope.$eval(attrs.popOverContent);
                        //hide popover when background is clicked
                        $documentElement.on('click touchstart', hidePopOver);
                        //hide popover when non-activities are focused (e.g. speaker icon, footer links)
                        $nonActivitiesElement.on('focus', hidePopOver);
                        $parentElement.on('click focus', openPopOver);
                    } else {
                        scope.recommendation = attrs.recommendation;
                        scope.popOverContent = scope.$eval(attrs.popOverText);
                        showPopOver();
                    }

                    $popover.on('click focus', stopEventPropagation);

                    scope.close = function() {
                        hidePopOver();
                    };

                    scope.$on('popOverComponent.close', function() {
                        hidePopOver();
                    });

                    scope.$on('popOverComponent.show', function() {
                        scope.popOverContent = scope.$eval(attrs.popOverText);
                        showPopOver();
                    });

                    scope.$on('$destroy', function() {
                        $documentElement.off('click touchstart', hidePopOver);
                        $nonActivitiesElement.off('focus', hidePopOver);
                        $parentElement.off('click focus', openPopOver);
                        $popover.off('click focus', stopEventPropagation);
                    });
                }
            };
        }
    ]);
