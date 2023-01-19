angular.module('Realize.assignment.filters', [
    'Realize.assignment.constants',
    'rlzComponents.components.i18n',
    'Realize.filters.ellipses',
    'Realize.analytics',
    'Realize.common.DateRangeSelectorService',
    'Realize.common.mediaQueryService'
])
    .directive('assignmentsFilters', [
        '$log',
        '$rootScope',
        '$routeParams',
        'ASSIGNMENT_CONSTANTS',
        'Analytics',
        'DateRangeSelectorService',
        'MediaQuery',
        function($log, $rootScope, $routeParams, ASSIGNMENT_CONSTANTS, Analytics, DateRangeSelectorService,
             MediaQuery) {

            'use strict';

            var dateRanges = [
                {
                    id: 'next7Days',
                    analyticLabel: 'Next 7 days',
                    label: 'dateRangeSelector.filter.rangeOption.next7Days',
                    order: 1
                },
                {
                    id: 'next14Days',
                    analyticLabel: 'Next 14 days',
                    label: 'dateRangeSelector.filter.rangeOption.next14Days',
                    order: 2
                },
                {
                    id: 'next30Days',
                    analyticLabel: 'Next 30 days',
                    label: 'dateRangeSelector.filter.rangeOption.next30Days',
                    order: 3
                },
                {
                    id: 'last7Days',
                    analyticLabel: 'Last 7 days',
                    label: 'dateRangeSelector.filter.rangeOption.last7Days',
                    order: 4
                },
                {
                    id: 'last14Days',
                    analyticLabel: 'Last 14 days',
                    label: 'dateRangeSelector.filter.rangeOption.last14Days',
                    order: 5
                },
                {
                    id: 'last30Days',
                    analyticLabel: 'Last 30 days',
                    label: 'dateRangeSelector.filter.rangeOption.last30Days',
                    order: 6
                },
                {
                    id: 'customRange',
                    analyticLabel: 'Custom dates',
                    label: 'dateRangeSelector.filter.rangeOption.customRange',
                    order: 7
                },
                {
                    id: 'entireClassDuration',
                    analyticLabel: 'Entire class duration',
                    label: 'assignmentList.filters.when.entireClassDuration',
                    order: 8,
                    default: true
                }
            ];

            return {
                templateUrl: 'templates/assignment/assignmentsFilters.html',
                scope: {
                    assignmentData: '=',
                    filters: '='
                },
                link: function(scope) {
                    var currentClass = $routeParams.classId,
                        existingFilter = $rootScope.currentUser.getAttribute('assignments.class.filters'),
                        currentFilter = angular.isDefined(existingFilter) ? existingFilter[currentClass] : undefined,
                        isCurrentClassFiltersDefined = !!currentFilter,
                        datepickerZIndexFixBeforeShow = function() {
                            $('#ui-datepicker-div').addClass('assignmentsFilter');
                        },
                        datepickerZIndexFixOnClose = function() {
                            $('#ui-datepicker-div').removeClass('assignmentsFilter');
                        },
                        hideUnavailableFilterOptions = function() {
                            var availableDropdownOptions = {
                                viewTypes: scope.assignmentData.viewTypes
                            };

                            scope.hiddenFilterOptions = {
                                view: {
                                    everyone: false,
                                    wholeClass: !_.contains(availableDropdownOptions.viewTypes,
                                        ASSIGNMENT_CONSTANTS.ASSIGNEE_TYPE.CLASS),
                                    group: !_.contains(availableDropdownOptions.viewTypes,
                                        ASSIGNMENT_CONSTANTS.ASSIGNEE_TYPE.GROUP),
                                    individual: true //Disabled by business decision
                                }
                            };
                        },
                        resetFilterOptions = function() {
                            angular.extend(scope.filters, {
                                viewing: 'everyone',
                                grade : 'all', //No longer allow changing per UX
                                dateRange: {
                                    id: null,
                                    startDate: null,
                                    endDate: null
                                },
                                show: 'current'
                            });

                            scope.hiddenFilterOptions = {
                                view: {
                                    everyone: false,
                                    group: true,
                                    wholeClass: true,
                                    individual: true
                                }
                            };

                            // Need to close any dropdown that is opened
                            $('.dropdown.open').removeClass('open');
                        }, notifySearchFiltersUpdate = function() {
                            scope.$emit('assignment:searchFilterUpdated', scope.filters);
                        };

                    // Defaults
                    resetFilterOptions();
                    hideUnavailableFilterOptions();
                    scope.customDateRangeOptions = dateRanges;
                    scope.userAttributeId = 'classDateRange';

                    // Extend with defined filters
                    if (isCurrentClassFiltersDefined) {
                        if (currentFilter) {
                            scope.filters.viewing = currentFilter.view ? currentFilter.view.toLowerCase() : 'everyone';
                            scope.filters.grade = 'all';
                        }
                        var selectedRange = DateRangeSelectorService.getSavedDateRange(
                            $rootScope.currentUser, scope.userAttributeId
                        );
                        scope.filters.dateRange.startDate = selectedRange.startDate;
                        scope.filters.dateRange.endDate = selectedRange.endDate;
                    }

                    scope.dateRangeSelectorOption = function(datePickerOption) {
                        datePickerOption.$setBeforeShow(datepickerZIndexFixBeforeShow);
                        datePickerOption.$setOnClose(datepickerZIndexFixOnClose);
                    };

                    scope.useShortLabels = !MediaQuery.breakpoint.isDesktop;

                    scope.$watch('filters', function(newVal, oldVal) {
                        if (newVal && (oldVal !== newVal)) {
                            var currentSelectedOption = DateRangeSelectorService.getSavedOption(
                                    $rootScope.currentUser, scope.userAttributeId
                                ),
                                isFirstVisitSwitchView = angular.isUndefined(currentSelectedOption) &&
                                    scope.filters.viewing !== oldVal.viewing,
                                isValidDateRange = scope.filters.dateRange.startDate &&
                                    scope.filters.dateRange.endDate,
                                isViewingAllAssignments = !scope.filters.dateRange.startDate &&
                                    !scope.filters.dateRange.endDate && currentSelectedOption === 'entireClassDuration',
                                isSwitchingCurrentHiddenFilter = scope.filters.show !== oldVal.show;

                            if (isValidDateRange || isViewingAllAssignments || isSwitchingCurrentHiddenFilter ||
                                isFirstVisitSwitchView) {
                                notifySearchFiltersUpdate();
                            }
                        }
                    }, true);

                    scope.$watch('assignmentData.viewTypes + assignmentData.gradeTypes', function() {
                        hideUnavailableFilterOptions();
                    });

                    scope.$on('assignment:filter:viewHidden', function() {
                        scope.filters.show = 'hidden';
                    });

                    scope.$on('dateRangeSelector.selection.change', function(event, newSelectorOption) {
                        var optionLabel = newSelectorOption.analyticLabel;
                        Analytics.track('track.action', {
                            category: 'Classes',
                            action: 'Assignments',
                            label: 'When Filter - ' + optionLabel
                        });
                    });

                    scope.$on('window.breakpoint.change', function bpChanged() {
                        scope.useShortLabels = !MediaQuery.breakpoint.isDesktop;
                    });
                }
            };
        }
    ]);
