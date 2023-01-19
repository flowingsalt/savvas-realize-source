angular
.module('Realize.common.DateRangeSelector', [
    'Realize.common.DateRangeSelectorService',
    'RealizeDataServices',
    'rlzComponents.components.i18n',
    'Realize.common.mediaQueryService'
])
.directive('dateRangeSelector', [
    '$log',
    '$rootScope',
    'RangeDatepickerOptions',
    'DateRangeSelectorService',
    'lwcI18nFilter',
    'MediaQuery',
    function($log, $rootScope, RangeDatepickerOptions, DateRangeSelectorService, lwcI18nFilter, MediaQuery) {
        'use strict';

        var defaultDateRangeOptions = DateRangeSelectorService.getDefaultDateRangeOptions();

        return {
            require: 'ngModel',
            scope: {
                dateRangeSelectorLabel: '=?',
                dateRangeSaveAttribute: '@?',
                customDateRangeOptions: '=?',
                setStartDatepickerOptions: '=?',
                setEndDatepickerOptions: '=?',
                notifyInit: '=?' //For the case where we want the watch event from first init
            },
            templateUrl: 'templates/common/dateRangeSelector/dateRangeSelector.dir.html',
            link: function(scope, el, attrs, ctrl) {

                var defaultLabel = lwcI18nFilter('dateRangeSelector.filter.label.dateWhen'),
                    saveValue = scope.dateRangeSaveAttribute,
                    saveValueStart = saveValue + '_start',
                    saveValueEnd = saveValue + '_end',
                    user = $rootScope.currentUser,
                    savedOption = user.getAttribute(saveValue),
                    savedOptionEnd = user.getAttribute(saveValueEnd),
                    savedOptionStart = user.getAttribute(saveValueStart),
                    initialized = !angular.isDefined(scope.notifyInit),
                    defaultOption,
                    rangeDatepickerOptions,
                    datePickerFormat = 'MM/DD/YYYY';

                scope.useShortLabels = !MediaQuery.breakpoint.isDesktop;

                scope.dateRangeSelectorLabel = scope.dateRangeSelectorLabel || defaultLabel;

                function findOptionById (name) {
                    return _.find(scope.dateRangeOptions, function(option) {
                        return name === option.id;
                    });
                }

                function getMomentObj(dateObject) {
                    return moment(dateObject, datePickerFormat);
                }

                scope.select = function(option) {
                    scope.selectedValue = option;
                };

                scope.$watchCollection('range', function(newVal, oldVal) {
                    var momentStartDate, momentEndDate;

                    if (newVal.endDate !== oldVal.endDate) {
                        momentEndDate = getMomentObj(scope.range.endDate);
                        user.setAttribute(saveValueEnd, momentEndDate.format(datePickerFormat), true);
                        if (newVal.endDate) {
                            scope.startDateOptions.maxDate = momentEndDate.toDate();
                        }
                    }
                    if (newVal.startDate !== oldVal.startDate) {
                        momentStartDate = getMomentObj(scope.range.startDate);
                        user.setAttribute(saveValueStart, momentStartDate.format(datePickerFormat), true);
                        if (newVal.startDate) {
                            scope.dueDateOptions.minDate = momentStartDate.toDate();
                        }
                    }
                    ctrl.$setViewValue(newVal);
                });

                scope.$watch('selectedValue', function(newVal, oldVal) {
                    if (!newVal || ((newVal === oldVal) && (newVal.id === 'customRange' || initialized))) { return; }

                    var newDateRange = DateRangeSelectorService.getDateRangeFromIdentifier(newVal.id);
                    scope.range.id = newVal.id;
                    scope.range.startDate = newDateRange.startDate;
                    scope.range.endDate = newDateRange.endDate;

                    if (saveValue && user) {
                        user.setAttribute(saveValue, newVal.id, true);
                    }

                    ctrl.$setViewValue(scope.range);
                    scope.$emit('dateRangeSelector.selection.change', newVal, scope.range);
                    initialized = true;
                }, true);

                rangeDatepickerOptions = new RangeDatepickerOptions('#filterDateStart', '#filterDateEnd');
                scope.startDateOptions = rangeDatepickerOptions.start;
                scope.dueDateOptions = rangeDatepickerOptions.end;

                if (angular.isFunction(scope.setStartDatepickerOptions)) {
                    scope.setStartDatepickerOptions(scope.startDateOptions);
                }
                if (angular.isFunction(scope.setEndDatepickerOptions)) {
                    scope.setEndDatepickerOptions(scope.dueDateOptions);
                }

                scope.dateRangeOptions = angular.isDefined(scope.customDateRangeOptions) ?
                    scope.customDateRangeOptions : defaultDateRangeOptions;

                defaultOption = _.findWhere(scope.dateRangeOptions, {default: true}).id;
                scope.selectedValue = findOptionById(angular.isDefined(savedOption) ? savedOption : defaultOption);
                scope.range = {
                    id: null,
                    startDate: null,
                    endDate: null
                };

                if (savedOption === 'customRange') {
                    if (DateRangeSelectorService.validateDate(savedOptionEnd) &&
                        DateRangeSelectorService.validateDate(savedOptionStart)) {
                        scope.range.id = savedOption;
                        scope.range.endDate = savedOptionEnd;
                        scope.range.startDate = savedOptionStart;
                    } else {
                        scope.select(findOptionById(defaultOption));
                    }
                }

                scope.$on('dateRangeSelector.selection.requested', function(event, newSelection) {
                    $log.log('DateRange selector update to', newSelection);
                    scope.selectedValue = findOptionById(newSelection);
                });

                scope.$on('window.breakpoint.change', function bpChanged() {
                    scope.useShortLables = !MediaQuery.breakpoint.isDesktop;
                });

            }
        };

    }
]);
