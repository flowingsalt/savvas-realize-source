// Base datepicker configs applies IE9/10 fix as well as click blur fix
// Start/End datepicker set min for end date based on start date and max for start date based on end date
// Range returns both Start&End in an obj
angular.module('RealizeDataServices')
    .factory('DatepickerOptions', [
        'Messages',
        'BrowserInfo',
        '$timeout',
        function(Messages, BrowserInfo, $timeout) {
            'use strict';

            function DatepickerOptions(dpElement) {
                var self = this,
                    blurClickedDatepicker = function(dpInst) {
                        if ((BrowserInfo.browser.isFirefox && dpInst && !dpInst._keyEvent) || event.type === 'click') {
                            $timeout(function() {
                                $(dpElement).blur();
                            });
                        }
                    };

                self.fixFocusIE = false; // http://www.objectpartners.com/2012/06/18/jquery-ui-datepicker-ie-focus-fix/

                self.onSelect = function(selectedDate, datepickerInst) {
                    self.fixFocusIE = true;
                    angular.element(this).blur().change().focus();
                    angular.forEach(self.onSelectCallBacks, function(callBack) {
                        callBack(selectedDate, datepickerInst);
                    });
                };

                self.onClose = function(selectedDate, datepickerInst) {
                    self.fixFocusIE = true;
                    blurClickedDatepicker(datepickerInst);
                    angular.forEach(self.onCloseCallBacks, function(callBack) {
                        callBack(selectedDate, datepickerInst);
                    });
                };

                self.beforeShow = function(datepickerInputEl, datepickerInst) {
                    var result = BrowserInfo.browser.isMSIE ? !self.fixFocusIE : true;
                    if (BrowserInfo.browser.isMSIE) {
                        self.fixFocusIE = false;
                    }
                    angular.forEach(self.beforeShowCallBacks, function(callBack) {
                        callBack(datepickerInputEl, datepickerInst);
                    });
                    return result;
                };

                self.monthNames = Messages.getMessagesAsArray('calendar.monthNames');

                self.dayNamesMin = Messages.getMessagesAsArray('calendar.dayNamesMin');

                self.beforeShowCallBacks = [];
                self.onCloseCallBacks = [];
                self.onSelectCallBacks = [];
            }

            DatepickerOptions.prototype.$setOnSelect = function(onSelectCallback) {
                this.onSelectCallBacks.push(onSelectCallback);
            };

            DatepickerOptions.prototype.$setOnClose = function(onCloseCallback) {
                this.onCloseCallBacks.push(onCloseCallback);
            };

            DatepickerOptions.prototype.$setBeforeShow = function(beforeShowCallback) {
                this.beforeShowCallBacks.push(beforeShowCallback);
            };

            DatepickerOptions.formatDate = function(date, addDays) {
                addDays = addDays || 0;
                return moment(date).add(addDays, 'days').format('MM/DD/YY');
            };

            return DatepickerOptions;
        }
    ])

.factory('StartDatepickerOptions', [
    '$log',
    'DatepickerOptions',
    function($log, DatepickerOptions) {
        'use strict';

        //pass endDatepicker so we can set the min correctly
        function StartDatepickerOptions(startDatepickerEl, endDatepickerEl) {
            DatepickerOptions.call(this, startDatepickerEl);

            this.$setBeforeShow(function() {
                var endDate = angular.element(endDatepickerEl).datepicker('getDate') || 0;
                if (endDate) {
                    angular.element(startDatepickerEl)
                        .datepicker('option', 'maxDate', DatepickerOptions.formatDate(endDate));
                }
            });
        }

        StartDatepickerOptions.prototype = Object.create(DatepickerOptions.prototype);
        StartDatepickerOptions.prototype.constructor = DatepickerOptions;

        return StartDatepickerOptions;

    }
])

.factory('EndDatepickerOptions', [
    '$log',
    'DatepickerOptions',
    function($log, DatepickerOptions) {
        'use strict';

        //pass startDatepicker so we can set the max correctly
        function EndDatepickerOptions(endDatepickerEl, startDatepickerEl, addDays) {
            DatepickerOptions.call(this, endDatepickerEl);

            this.$setBeforeShow(function() {
                var startDate = angular.element(startDatepickerEl).datepicker('getDate') || 0;

                if (startDate) {
                    angular.element(endDatepickerEl)
                        .datepicker('option', 'minDate', DatepickerOptions.formatDate(startDate, addDays));
                }
            });
        }

        EndDatepickerOptions.prototype = Object.create(DatepickerOptions.prototype);
        EndDatepickerOptions.prototype.constructor = DatepickerOptions;

        return EndDatepickerOptions;
    }
])

.factory('RangeDatepickerOptions', [
    '$log',
    'StartDatepickerOptions',
    'EndDatepickerOptions',
    function($log, StartDatepickerOptions, EndDatepickerOptions) {
        'use strict';

        function RangeDatepickerOptions(startDatepickerEl, endDatepickerEl, addDays) {
            this.start = new StartDatepickerOptions(startDatepickerEl, endDatepickerEl);
            this.end = new EndDatepickerOptions(endDatepickerEl, startDatepickerEl, addDays);
        }

        return RangeDatepickerOptions;
    }
]);
