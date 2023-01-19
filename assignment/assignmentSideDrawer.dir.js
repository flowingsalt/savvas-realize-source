angular.module('Realize.assignment.sideDrawer', [
    'Realize.common.mediaQueryService',
    'Realize.analytics',
    'Realize.assignment.utilService',
    'rlzComponents.components.featureManagement'
])
    .directive('assignmentSideDrawer', [
        '$timeout',
        '$rootScope',
        '$location',
        'MediaQuery',
        'AssignmentUtil',
        'breadcrumbTelemetryService',
        'BREADCRUMB_TELEMETRY_CONSTANTS',
        'featureManagementService',
        function($timeout, $rootScope, $location, MediaQuery, AssignmentUtil, breadcrumbTelemetryService,
            BREADCRUMB_TELEMETRY_CONSTANTS,
            featureManagementService) {
            'use strict';

            var $currentFocusedAssignment,
                $footer = angular.element('#footer'),
                $drawerContainer,
                $assignmentList,
                tabState,
                bottom = 'bot';

            tabState = (function() {
                //get max tabIndex already in place on page, so we know where to start
                var maxExistingTabIdx = -1,
                    currentTabIdx,
                    tabMgr;

                angular.element('[tabindex]').each(function getMax(i, e) {
                    maxExistingTabIdx = Math.max(maxExistingTabIdx, e.tabIndex);
                });
                currentTabIdx = maxExistingTabIdx + 1;

                tabMgr = {
                    reset: function resetTabIdx() {
                        currentTabIdx = maxExistingTabIdx + 1;
                    }
                };

                function current() {
                    return currentTabIdx;
                }

                function next() {
                    return (currentTabIdx += 1);
                }

                Object.defineProperties(tabMgr, {
                    currentIndex: {
                        get: current
                    },
                    nextIndex: {
                        get: next
                    }
                });

                return tabMgr;
            })();

            function setListItemsTabIdx() {
                tabState.reset();

                function updateTabIdx(idx, e) {
                    e.tabIndex = tabState.nextIndex;
                }

                $assignmentList.find('li:not(.rowHeader)').each(function procesListItem(idx, li) {
                    angular.element(li).find('a, button').each(updateTabIdx);

                    if (li.classList.contains('selected')) {
                        angular.element('.drawerContainer').find('a, button').each(updateTabIdx);
                    }
                });

                $footer.find('a, button').each(function updateTabIdx(i, e) {
                    e.tabIndex = tabState.nextIndex;
                });
            }

            function resetTabIndexesToOriginal() {

                function removeTabIdx(idx, e) {
                    e.removeAttribute('tabindex');
                }

                $assignmentList.find('[tabindex]').each(removeTabIdx);
                $footer.find('[tabindex]').each(removeTabIdx);
            }

            function removeDrawerTabIndexes() {
                $drawerContainer.find('a, button').attr('tabindex', '-1');
            }

            function getSelectedAssignment() {
                $currentFocusedAssignment = $assignmentList.find('li.selected').first();
            }

            function getFirstFocusableDrawerLink() {
                return $drawerContainer.find(':focusable').first();
            }

            return {
                templateUrl: 'templates/assignment/assignmentSideDrawer.html',
                link: function(scope, element) {
                    scope.orientation = 'VERTICAL';
                    $drawerContainer = element.find('.drawerContainer');
                    $assignmentList = angular.element('ul.assignmentList');

                    var assignmentSelectedUnwatcher;
                    var breakpointChangeUnsubscribe;
                    var deregisterSideDrawerCloseListener;

                    var notifyDrawerClose = function() {
                            scope.$emit('assignmentListByClass.drawer.close');
                        },
                        moveFocusToAssignment = function() {
                            $currentFocusedAssignment.find(':focusable').first().focus();
                        };

                    removeDrawerTabIndexes();

                    function adjustDrawerPosition() {
                        $timeout(function() {
                            var drawerHeight = $drawerContainer.height(),
                                halfDrawerHeight = drawerHeight / 2,
                                listHeight = $assignmentList.height(),
                                selectedRow = angular.element('.itemRow.selected:not(.itemRow.selected-remove)'),
                                selectedOffsetTop,
                                halfSelectedRowHeight,
                                newPosition,
                                newMarginTop,
                                centeredDrawerDisplayHeight,
                                isListLongerThanDrawer;

                            if (selectedRow.length === 0) {
                                //Called during animation, find the latest selection
                                selectedRow = angular.element('.itemRow.selected-add');
                            }

                            selectedOffsetTop = selectedRow.position().top;
                            halfSelectedRowHeight = selectedRow.height() / 2;
                            centeredDrawerDisplayHeight = halfDrawerHeight - halfSelectedRowHeight;
                            isListLongerThanDrawer = listHeight > drawerHeight;

                            if (selectedOffsetTop < centeredDrawerDisplayHeight) {
                                newPosition = 'top';
                                newMarginTop = 0;
                            } else if (isListLongerThanDrawer &&
                                listHeight < (selectedOffsetTop + centeredDrawerDisplayHeight)) {
                                newPosition = bottom;
                                newMarginTop = scope.showExternalSideDrawer() ? 0 : listHeight - drawerHeight - 8;
                            } else {
                                newPosition = 'mid';
                                newMarginTop = selectedOffsetTop - halfDrawerHeight + halfSelectedRowHeight;
                            }
                            scope.setDrawerContainerPosition(newPosition);
                            $drawerContainer.css({marginTop: newMarginTop});
                            angular.element('body', 'html').animate({scrollTop: newMarginTop}, 200);

                            $timeout(setListItemsTabIdx, 0);

                            if ($rootScope.isKeyboardInUse) {
                                getSelectedAssignment();
                                getFirstFocusableDrawerLink().focus();
                            }
                        }, 0);
                    }

                    deregisterSideDrawerCloseListener  = scope.$on('assignment.sideDrawer.close', function() {
                        scope.resetDrawer();
                    });
                    scope.$on('$destroy', deregisterSideDrawerCloseListener);

                    scope.resetDrawer = function resetAssignmentDrawer() {
                        notifyDrawerClose();
                        if ($rootScope.isKeyboardInUse) {
                            moveFocusToAssignment();
                        }
                        removeDrawerTabIndexes();
                        resetTabIndexesToOriginal();
                        setTimeout(function clearMargin() {
                            $drawerContainer.css({marginTop: 0}); //Clear whitespace from margin
                        });
                    };

                    assignmentSelectedUnwatcher = scope.$watch('assignmentSelected', function(assignment) {
                        if (angular.isDefined(assignment)) {
                            getSelectedAssignment();
                            $timeout(adjustDrawerPosition, 200);
                        } else {
                            scope.resetDrawer();
                        }
                    });

                    //if resized from large to small, want to clean up indexes
                    breakpointChangeUnsubscribe = scope.$on('window.breakpoint.change', function breakpointChanged() {
                        if (!MediaQuery.breakpoint.isDesktop) {
                            resetTabIndexesToOriginal();
                            assignmentSelectedUnwatcher();
                            breakpointChangeUnsubscribe();
                        }
                    });

                    scope.showScore = function(assignment) {
                        return !(assignment.contentItem.$isTest() || assignment.type === 'ADAPTIVE') &&
                            assignment.studentsCompleted >= 1;
                    };

                    scope.breadcrumbHandler = function($event, path, breadcrumb) {
                        $event.stopPropagation();
                        var breadcrumbItem = $event.currentTarget.text;
                        var extensionKeys = {
                            page: BREADCRUMB_TELEMETRY_CONSTANTS.PAGE.ASSIGNMENT,
                            subpage: BREADCRUMB_TELEMETRY_CONSTANTS.SUBPAGE.ASSIGNMENTS_BY_CLASS_STATUS,
                            area: BREADCRUMB_TELEMETRY_CONSTANTS.AREA.CLASSES,
                        };
                        breadcrumbTelemetryService.sendTelemetryEvents(breadcrumbItem, breadcrumb, extensionKeys);
                        AssignmentUtil.navigateToSourceProgram(path);
                    };

                    scope.showExternalSideDrawer = function() {
                        return featureManagementService.isExternalSideDrawerEnabled();
                    };

                    scope.setDrawerContainerPosition = function(position) {
                        if (!scope.showExternalSideDrawer()) {
                            return;
                        }
                        if (position === bottom) {
                            $drawerContainer.css({position: 'absolute', right: 0, bottom: 0});
                        } else {
                            $drawerContainer.css({position: 'relative', right: 0, bottom: 0});
                        }
                    };

                    scope.$on('$destroy', function scopeDestroy() {
                        resetTabIndexesToOriginal();
                    });
                }
            };
        }]);
