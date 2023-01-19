angular.module('realize.core.isoDateService', [])
    .service('ISODateService', [
        function() {
            'use strict';

            this.toDateTimeString = function(date) {
                return date.toString('yyyy-MM-ddTHH:mm:ss') + this.getOffsetFromUTC(date);
            };

            this.toDateString = function(date) {
                return date.toString('yyyy-MM-dd');
            };

            //make sure range includes TZ for this date
            this.toDateStringWithZone = function(date) {
                return date.toString('yyyy-MM-ddT00:00:00') + this.getOffsetFromUTC(date);
            };

            this.toStartOfDayStringWithZone = this.toDateStringWithZone;

            this.toStartOfNextDayStringWithZone = function(date) {
                var dateRolledForward = date.clone().clearTime().add({
                    days: 1
                });
                return this.toDateTimeString(dateRolledForward);
            };

            this.toEndOfDayStringWithZone = function(date) {
                var dateRolledForward = date.clone().clearTime().add({
                    hours: 23,
                    minutes: 59,
                    seconds: 59
                });
                return this.toDateTimeString(dateRolledForward);
            };

            this.getStringForOffset = function(offset) {
                return ((offset < 0 ? '+' : '-') + this.pad(Math.floor(Math.abs(offset) / 60), 2) + ':' +
                    this.pad(Math.abs(offset) % 60, 2));
            };

            this.getOffsetFromUTC = function(date) {
                if (angular.isUndefined(date)) {
                    date = new Date();
                }
                var offset = date.getTimezoneOffset();
                return this.getStringForOffset(offset);
            };

            this.pad = function(number, length, padChar) {
                if (angular.isUndefined(length)) {
                    length = 2;
                }
                if (angular.isUndefined(padChar)) {
                    padChar = '0';
                }
                var str = '';
                str += number;
                while (str.length < length) {
                    str = padChar + str;
                }
                return str;
            };

        }
    ]);
