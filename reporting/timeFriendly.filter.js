angular.module('Realize.reporting.friendlyTimeFilter', [])
    .filter('friendlyTime', [
        '$filter',
        function($filter) {
            'use strict';

            return function(input, alt) {
                var defAlt = '-',
                    localize = $filter('lwcI18n');

                if (input === 0) {
                    return [0, localize('usageRecap.time.second')].join(' ');
                }

                if (!angular.isNumber(input)) {
                    return alt || defAlt;
                }

                var str,
                    hours, minutes, seconds,
                    total,
                    htms = 3600000, // milliseconds in one hour
                    mtms = 60000, // milliseconds in one minute
                    stms = 1000; // milliseconds in one second

                str = [];

                total = input;

                hours = Math.floor(total / htms);
                if (hours) {
                    total = total - (hours * htms);
                    str.push([hours, localize('usageRecap.time.hour')].join(' '));
                }

                minutes = Math.floor(total / mtms);
                if (minutes) {
                    total = total - (minutes * mtms);
                    str.push([minutes, localize('usageRecap.time.minute')].join(' '));
                }

                seconds = Math.floor(total / stms);
                if (seconds) {
                    str.push([seconds, localize('usageRecap.time.second')].join(' '));
                }

                return (str.length) ? str.join(', ') : alt || defAlt;

            };
        }
    ]);
