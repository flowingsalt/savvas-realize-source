// opens datepicker on clicking of calendar icon
// @attr highlight-week. Optional. Highlights current week, instead of just current date.

// Usage:
// <input ui-date type='text' id='dateInput' />
// <i class='icon-calendar' show-datepicker='#dateInput' highlight-week='false'></i>
angular.module('RealizeDirectives')
    .directive('showDatepicker', [
        function() {
            'use strict';

            return {
                scope: {
                    highlightWeek: '@'
                },
                link: function(scope, el, attr) {

                    scope.showHighlight = function() {
                        var $picker = $('a.ui-state-active');
                        // find active, switch day to week
                        if ($picker.length) {
                            $picker.removeClass('ui-state-active')
                            .closest('tr')
                            .addClass('ui-state-active');
                        }
                    };

                    el.on('click', function(e) {
                        var dateField = angular.element(attr.showDatepicker);
                        e.preventDefault();
                        e.stopPropagation();
                        // To reproduce icon click of jquery.ui.datepicker.js

                        if ($.datepicker._datepickerShowing && $.datepicker._lastInput === dateField[0]) {
                            dateField.datepicker('hide');
                        } else if ($.datepicker._datepickerShowing && $.datepicker._lastInput !== dateField[0]) {
                            $.datepicker._hideDatepicker();
                            dateField.datepicker('show');
                        } else {

                            dateField.datepicker('show');

                            if (scope.highlightWeek) {
                                scope.showHighlight();
                            }
                        }

                        return false;
                    });

                    scope.$on('datepicker.showWeeklyHighlight', function() {
                        scope.showHighlight();
                    });
                }
            };
        }
    ]);
