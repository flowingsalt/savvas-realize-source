angular.module('Realize.calendar.uiCalendarDirective', [])
    .config(['$provide',
        function($provide) {
            'use strict';

            $provide.decorator('uiCalendarDirective', ['$delegate', function($delegate) {

                var uiCalendar = $delegate[0],
                    linkOriginal = uiCalendar.link;

                uiCalendar.compile = function() {
                    var linkNew = function(scope) {
                        linkOriginal.apply(this, arguments);
                        scope.$eval(angular.element('#calendar table').attr('aria-labelledby', 'calendarTitle'));
                    };

                    return linkNew;
                };

                return $delegate;
            }]);
        }]);
