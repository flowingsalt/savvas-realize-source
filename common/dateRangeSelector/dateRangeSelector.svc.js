angular.module('Realize.common.DateRangeSelectorService', [])
    .service('DateRangeSelectorService', [
        function() {
            'use strict';

            var defaultDateRangeOptions = [
                    {
                        id: 'last7Days',
                        analyticLabel: 'Last 7 days',
                        label: 'dateRangeSelector.filter.rangeOption.last7Days',
                        order: 1,
                    },
                    {
                        id: 'last14Days',
                        analyticLabel: 'Last 14 days',
                        label: 'dateRangeSelector.filter.rangeOption.last14Days',
                        order: 2,
                    },
                    {
                        id: 'last30Days',
                        analyticLabel: 'Last 30 days',
                        label: 'dateRangeSelector.filter.rangeOption.last30Days',
                        order: 3,
                        default: true
                    },
                    {
                        id: 'last60Days',
                        analyticLabel: 'Last 60 days',
                        label: 'dateRangeSelector.filter.rangeOption.last60Days',
                        order: 4,
                    },
                    {
                        id: 'customRange',
                        analyticLabel: 'Custom dates',
                        label: 'dateRangeSelector.filter.rangeOption.customRange',
                        order: 5
                    }
                ];

            this.validateDate = function(dateObj) {
                return moment(dateObj).isValid();
            };

            this.getDefaultDateRangeOptions = function() {
                return defaultDateRangeOptions;
            };

            this.getSavedOption = function(currentUser, dateRangeAttributeName, validateCustomRange) {
                var savedOption = currentUser.getAttribute(dateRangeAttributeName);

                if (validateCustomRange && savedOption === 'customRange') {
                    var savedStart = currentUser.getAttribute(dateRangeAttributeName + '_start'),
                        savedEnd = currentUser.getAttribute(dateRangeAttributeName + '_end');
                    if (this.validateDate(savedStart) && this.validateDate(savedEnd)) {
                        return savedOption;
                    } else {
                        return false;
                    }
                }
                return savedOption;
            };

            this.getSavedDateRange = function(currentUser, dateRangeAttributeName) {
                var savedOption = currentUser.getAttribute(dateRangeAttributeName),
                    savedStart = currentUser.getAttribute(dateRangeAttributeName + '_start'),
                    savedEnd = currentUser.getAttribute(dateRangeAttributeName + '_end');

                return this.getDateRangeFromIdentifier(savedOption, savedStart, savedEnd);
            };

            this.getDateRangeFromIdentifier = function(id, startDate, endDate) {
                var range,
                    validStartEnd = this.validateDate(startDate) && this.validateDate(endDate);

                if (!id || id === 'entireClassDuration' ||
                    (id === 'customRange' && !validStartEnd)) {
                    range = {
                        startDate: null,
                        endDate: null
                    };
                } else if (id === 'customRange' && validStartEnd) {
                    range = {
                        startDate: startDate,
                        endDate: endDate
                    };
                } else if (id === 'today') {
                    range = {
                        startDate: moment(),
                        endDate: moment()
                    };
                } else if (id === 'yesterday') {
                    range = {
                        startDate: moment().subtract(1, 'days'),
                        endDate: moment().subtract(1, 'days')
                    };
                } else {
                    var isFuture = id.indexOf('next') >= 0,
                        findOffset = /(\d+)/.exec(id),
                        today = moment(),
                        days;

                    if (findOffset && angular.isDefined(findOffset[0])) {
                        days = parseInt(findOffset[0], 10);
                        days -= 1;

                        if (isFuture) {
                            range = {
                                startDate: today,
                                endDate: moment().add(days, 'days')
                            };
                        } else {
                            range = {
                                startDate: moment().subtract(days, 'days'),
                                endDate: today
                            };
                        }
                    } else {
                        range = {
                            startDate: null,
                            endDate: null
                        };
                    }
                }
                return range;
            };

        }
    ]);
