angular.module('RealizeApp')
    .service('DatepickerUtil', [
        'KEY_CODES',
        function(KEY_CODES) {
            'use strict';

            //TODO unit test
            //NOTE: If we are not attaching the DOM Manipulation code to a DOM node, then use service else directive.
            this.customizedKeydownEventForDatepicker = function(event, selector) {
                var code = event.keyCode || event.which, tooltip;
                // If key is not TAB
                if (code !== KEY_CODES.TAB) {
                    event.preventDefault();
                    event.stopImmediatePropagation();

                    // And selective keys used 'for performance on other keys'
                    if (_.contains(_.values(KEY_CODES), code)) {
                        // Get current date
                        var parts = angular.element(selector).val().split('/');
                        var currentDate = new Date(parts[2], parts[0] - 1, parts[1]);

                        // Show next/previous day/week  month/year
                        switch (code) {
                            // CTRL+LEFT, CMD+LEFT -1 day, ALT+LEFT -1 month
                            case KEY_CODES.LEFT:
                                if (event.ctrlKey || event.metaKey) {
                                    currentDate.setDate(currentDate.getDate() - 1);
                                }
                                if (event.altKey) {
                                    currentDate.setMonth(currentDate.getMonth() - 1);
                                }
                                break;
                            // CTRL+UP, CMD+UP -7 day, ALT+UP +1 year
                            case KEY_CODES.UP:
                                if (event.ctrlKey || event.metaKey) {
                                    currentDate.setDate(currentDate.getDate() - 7);
                                }
                                if (event.altKey) {
                                    currentDate.setFullYear(currentDate.getFullYear() + 1);
                                }
                                break;
                            // CTRL+RIGHT, CMD+RIGHT -1 day, ALT+RIGHT +1 month
                            case KEY_CODES.RIGHT:
                                if (event.ctrlKey || event.metaKey) {
                                    currentDate.setDate(currentDate.getDate() + 1);
                                }
                                if (event.altKey) {
                                    currentDate.setMonth(currentDate.getMonth() + 1);
                                }
                                break;
                            // CTRL+DOWN, CMD+DOWN +7 day, ALT+DOWN -1 year
                            case KEY_CODES.DOWN:
                                if (event.ctrlKey || event.metaKey) {
                                    currentDate.setDate(currentDate.getDate() + 7);
                                }
                                if (event.altKey) {
                                    currentDate.setFullYear(currentDate.getFullYear() - 1);
                                }
                                break;
                            // PAGE_UP -1 month, CTRL+PAGE_UP -1 year
                            case KEY_CODES.PAGE_UP:
                                currentDate.setMonth(currentDate.getMonth() - 1);
                                if (event.ctrlKey) {
                                    currentDate.setFullYear(currentDate.getFullYear() - 1);
                                }
                                break;
                            // PAGE_DOWN +1 month, CTRL+PAGE_DOWN +1 year
                            case KEY_CODES.PAGE_DOWN:
                                currentDate.setMonth(currentDate.getMonth() + 1);
                                if (event.ctrlKey) {
                                    currentDate.setFullYear(currentDate.getFullYear() + 1);
                                }
                                break;
                            case KEY_CODES.ESC:
                                currentDate = null;
                                angular.element(selector).datepicker('hide');
                                break;
                            case KEY_CODES.ENTER:
                                angular.element(selector).datepicker('hide');
                                break;
                        }

                        // If result is ok then set the DATE
                        if (currentDate !== null) {
                            angular.element(selector).datepicker('setDate', currentDate);
                            tooltip = currentDate.getMonth() + 1 + '/' + currentDate.getDate() + '/' +
                                currentDate.getYear();
                            angular.element(selector).attr('title', tooltip);
                        }
                    }   else {
                        return false;
                    } // If other keys pressed.. return false
                }
            };
        }
    ]);
