angular.module('Realize.reporting.friendlyTime', [])
    .directive('friendlyTime', [
        '$filter',
        function($filter) {
            'use strict';

            var hoursToMilliseconds = 3600000,
                minutesToMilliseconds = 60000,
                secondsToMilliseconds = 1000;

            function getTimePortion(total, divisor) {
                return Math.floor(total / divisor);
            }

            return {
                restrict: 'A',
                templateUrl: 'templates/reporting/timeFriendly.dir.html',
                scope: {
                    timeToDisplay: '=friendlyTime',
                    zeroState: '=?'
                },
                link: function(scope) {

                    var defAlt = '-',
                        localize = $filter('lwcI18n');

                    function calculate(input) {
                        input = Math.round(input);

                        if (input === 0) {
                            return [0, localize('usageRecap.time.second')].join(' ');
                        }

                        if (!angular.isNumber(input)) {
                            return scope.zeroState || defAlt;
                        }

                        var hours, minutes, seconds,
                            total = input;

                        hours = getTimePortion(total, hoursToMilliseconds);
                        scope.hours = hours;

                        total = total - ((hours || 0) * hoursToMilliseconds);

                        minutes = getTimePortion(total, minutesToMilliseconds);
                        scope.minutes = minutes;

                        total = total - ((minutes || 0) * minutesToMilliseconds);

                        seconds = getTimePortion(total, secondsToMilliseconds);
                        scope.seconds = seconds;
                    }

                    scope.$watch('timeToDisplay', calculate);
                }
            };
        }
    ]);
