angular.module('Realize.common.teacherIconDirective', [
    'Realize.user.currentUser',
    'rlzComponents.components.i18n',
    'Realize.filters.standardNumber',
    'Realize.paths'
])
    .directive('teacherIcon', [
        '$currentUser',
        'PATH',
        'lwcI18nFilter',
        'standardNumberFilter',
        function($currentUser, PATH, lwcI18nFilter, standardNumberFilter) {
            'use strict';

            return {
                scope: {
                    item: '=teacherIcon'
                },
                templateUrl: PATH.TEMPLATE_ROOT +
                                '/common/teacherIcon/teacherIcon.dir.html',
                link: function(scope) {
                    var $body = angular.element('body');

                    function closeAll ($event) {
                        var target = angular.element($event.currentTarget);
                        angular.forEach(angular.element('*[popover]'), function(value) {
                            var popoverElement = angular.element(value);
                            //Only do this for all popovers other than the current one that cause this event
                            if (!(popoverElement.is(target) || popoverElement.has(target).length > 0)) {
                                //Remove the popover element from the DOM
                                popoverElement.siblings('.popover').remove();
                                //Set the state of the popover in the scope to reflect this
                                popoverElement.scope().tt_isOpen = false;
                            }
                        });
                    }

                    scope.toggle = function($event) {
                        closeAll($event);
                        $event.stopPropagation();
                    };

                    scope.isCountsTowardMastery = function() {
                        return $currentUser.isTeacher && scope.item.countsTowardMastery;
                    };

                    scope.isHideFromStudent = function() {
                        return scope.item.hideFromStudent && scope.item.teacherOnly !== 'Yes';
                    };

                    scope.isTeacherOnly = function() {
                        return scope.item.teacherOnly === 'Yes';
                    };

                    scope.isDistanceLearning = function() {
                        var isItemHasAssociativeDistanceLearning = scope.item.associativeProps &&
                            scope.item.associativeProps.isDistanceLearning === 'true';
                        var isItemHasDistanceLearning = scope.item.distanceLearning === 'Yes';
                        return $currentUser.isTeacher && (isItemHasDistanceLearning ||
                            isItemHasAssociativeDistanceLearning);
                    };

                    /* TODO: Update angular UI bootstrap popover component if required
                                to pass html structure to popover */
                    // CTM is Counts Towards Mastery
                    scope.getCTMPopoverContent = function() {
                        var isStandardDataAvailable = scope.item.standards && scope.item.standards.length > 0;

                        if (isStandardDataAvailable) {
                            var popoverStandardsText,
                                standardTermValues = [],
                                popoverStandardsLimit = 6; // for showing max 6 standard TERM values in popover

                            angular.forEach(scope.item.standards, function(standard) {
                                var term = standardNumberFilter(standard.id);
                                // indexOf to avoid duplicate standard term values
                                if (standardTermValues.indexOf(term) === -1) {
                                    standardTermValues.push(term);
                                }
                            });

                            popoverStandardsText = standardTermValues.sort()
                                .slice(0, popoverStandardsLimit)
                                .join(', ');

                            return (lwcI18nFilter('searchResults.teacherIcon.countsTowardMasteryWithStandards') +
                                    '<br>' + popoverStandardsText);
                        } else {
                            return lwcI18nFilter('searchResults.teacherIcon.countsTowardMastery');
                        }
                    };
                    scope.$on('$destroy', function() {
                        $body.off('click', closeAll);
                    });
                }
            };
        }
    ]);
