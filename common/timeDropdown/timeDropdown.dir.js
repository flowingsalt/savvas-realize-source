angular.module('Realize.common.timeDropdownDirective', [
    'Realize.paths',
    'Realize.common.keyboardSupport.keyCodes',
    'Realize.assignment.constants'
])
    .directive('timeDropdown', [
        'PATH',
        'KEY_CODES',
        'ASSIGNMENT_CONSTANTS',
        '$document',
        function(PATH, KEY_CODES, ASSIGNMENT_CONSTANTS, $document) {
            'use strict';

            return {
                require: '^ngModel',
                scope: true,
                link: function(scope, element, attrs, ngModelCtrl) {
                    var $input = element,
                        nameOfTimeField = $input.attr('name'),
                        associatedDate = scope.$eval(attrs.timeDropdown),
                        regexStringArray = [
                            '(2[0-3]|1[0-9]|0[0-9]|[0-9])\\s?(AM|PM)?',
                            '([0-9]|0[0-9]|1[0-9]|2[0-3]):\\s?(AM|PM)?',
                            '([0-9]|0[0-9]|1[0-9]|2[0-3]):([0-5])',
                            '([0-9]|0[0-9]|1[0-9]|2[0-3]):([0-5][0-9])',
                            '([0-9]|0[0-9]|1[0-9]|2[0-3]):([0-5][0-9]|[0-5])\\s?(AM|PM)'
                        ],
                        regexPatternArray = [],
                        closeTimeDropdown = function() {
                            $input.parent().removeClass('open');
                        },
                        isTimeDropdownOpen = function() {
                            return $input.parent().hasClass('open');
                        },
                        validateTime = function(time) {
                            var isValid = false,
                                pattern;
                            for (var i = 0; i < regexPatternArray.length; i++) {
                                pattern = regexPatternArray[i];
                                if (pattern.test(time)) {
                                    isValid = true;
                                    break;
                                }
                            }
                            ngModelCtrl.$setValidity('pattern', isValid);

                            return isValid;
                        },
                        isToday = function(date) {
                            return (new Date(date)).toDateString() === (new Date()).toDateString();
                        },
                        autoCorrect = function() {
                            var pattern,
                                matchedArray,
                                autoCorrectedTime,
                                timeQualifier,
                                timeValue,
                                timeFormat,
                                isMilitaryTimeConveretdToRegular = false,
                                convertToTimeFormat = function(timeString) {
                                    if (!/:/.test(timeString)) {
                                        timeString += ':00';
                                    } else if (/:$/.test(timeString)) {
                                        timeString += '00';
                                    } else {
                                        timeString = timeString.replace(/:\d{1}$/, '$&0');
                                    }

                                    var hour = parseInt(timeString.substring(0, timeString.indexOf(':')));

                                    // convert military format to regular
                                    if (hour > 12) {
                                        hour = (hour - 12).toString();
                                        isMilitaryTimeConveretdToRegular = true;
                                    } else if (hour === 0) {
                                        hour = '12';
                                    }

                                    timeString = hour + timeString.substring(timeString.indexOf(':'));
                                    return timeString;
                                };

                            // filter out the matched time string from value entered in input field
                            for (var i = regexStringArray.length - 1; i >= 0; i--) {
                                if (!scope.autoCorrected) {
                                    pattern = regexStringArray[i];
                                    matchedArray = ngModelCtrl.$viewValue.match(new RegExp(pattern, 'i'));
                                    if (matchedArray && matchedArray.length) {
                                        autoCorrectedTime = matchedArray[0];
                                        scope.autoCorrected = true;
                                        break;
                                    }
                                }
                            }

                            // convert the matched time string into HH:MM am/pm format
                            if (scope.autoCorrected) {
                                if (new RegExp('\\s?(AM|PM)', 'i').test(autoCorrectedTime)) {
                                    timeQualifier = (autoCorrectedTime.match(new RegExp('\\s?(AM|PM)', 'i'))[0])
                                        .trim();
                                    timeValue = autoCorrectedTime.substring(0,
                                        autoCorrectedTime.indexOf(timeQualifier)).trim();

                                    timeFormat = convertToTimeFormat(timeValue);
                                    timeQualifier = timeQualifier.toLowerCase();
                                } else {
                                    timeFormat = convertToTimeFormat(autoCorrectedTime);

                                    if (!associatedDate || (associatedDate && !isToday(associatedDate))) {
                                        timeQualifier = isMilitaryTimeConveretdToRegular ?
                                            ASSIGNMENT_CONSTANTS.TIMES.PM : ASSIGNMENT_CONSTANTS.TIMES.AM;
                                    } else {
                                        var defaultTimeQualifier = ASSIGNMENT_CONSTANTS.TIMES.AM,
                                            currentTime,
                                            userEnteredTimeString,
                                            userEnteredTime,
                                            middayTime;

                                        userEnteredTimeString = associatedDate + ' ' + timeFormat;

                                        currentTime = new Date();
                                        userEnteredTime = new Date(userEnteredTimeString + ' ' + defaultTimeQualifier);
                                        middayTime = new Date(associatedDate + ' ' +
                                            ASSIGNMENT_CONSTANTS.TIMES.MID_DAY);

                                        //set am/pm based on current time and midday time when selected date is today
                                        if (userEnteredTime < currentTime) {
                                            timeQualifier = ASSIGNMENT_CONSTANTS.TIMES.PM;
                                        } else if (userEnteredTime >= middayTime) {
                                            timeQualifier = ASSIGNMENT_CONSTANTS.TIMES.PM;
                                        } else {
                                            timeQualifier = defaultTimeQualifier;
                                        }
                                    }
                                }
                                autoCorrectedTime = timeFormat + ' ' + timeQualifier;
                                ngModelCtrl.$setViewValue(autoCorrectedTime);
                                ngModelCtrl.$render();
                                scope.autoCorrected = false;
                                autoCorrectedTime = '';
                                scope.isAutoCorrectionRequired = false;
                                isMilitaryTimeConveretdToRegular = false;
                                scope.$emit('time.autocorrected', nameOfTimeField);
                            }
                        };

                    scope.isValidationRequired = false;
                    scope.autoCorrected = false;
                    scope.isAutoCorrectionRequired = false;

                    scope.$watch(attrs.timeDropdown, function(newValue, oldValue) {
                        if (newValue !== oldValue) {
                            associatedDate = newValue;
                            validateTime(scope.$eval(attrs.ngModel));
                        }
                    });

                    // prepare regular expression pattern array based on regex strings required to test
                    angular.forEach(regexStringArray, function(regexString) {
                        regexPatternArray.push(new RegExp('^[\\D]*' + regexString + '[\\D]*$', 'i'));
                    });

                    // close time dropdown when user starts typing
                    $input.on('input', function() {
                        closeTimeDropdown();
                        scope.isValidationRequired = true;
                    });

                    $input.on('keydown', function(event) {
                        var code = (event.keyCode ? event.keyCode : event.which);
                        if (code === KEY_CODES.TAB) {
                            if (isTimeDropdownOpen()) {
                                closeTimeDropdown();
                            }
                            // auto correct time field on focus out if valid - keyboard navigation
                            if (scope.isAutoCorrectionRequired) {
                                autoCorrect();
                            }
                        }
                        scope.isValidationRequired = true;
                    });

                    // auto correct time field on focus out if valid
                    $input.on('focusout', function() {
                        if (!isTimeDropdownOpen() && scope.isAutoCorrectionRequired) {
                            autoCorrect();
                        }
                    });

                    scope.$on('time.updated.in.controller', function(event, name) {
                        if (nameOfTimeField === name) {
                            scope.isValidationRequired = false;
                            scope.isAutoCorrectionRequired = false;
                            ngModelCtrl.$setValidity('pattern', true);
                        }
                    });

                    scope.$watch(attrs.ngModel, function(newVal, oldVal) {
                        // validate time field
                        if (newVal !== oldVal && scope.isValidationRequired && !scope.autoCorrected) {
                            var isValid = validateTime(newVal);
                            scope.isAutoCorrectionRequired = isValid;
                            scope.isValidationRequired = false;
                        }
                    });

                    // auto correct time field on focus out if valid
                    $document.on('click', function() {
                        if (!isTimeDropdownOpen() && scope.isAutoCorrectionRequired) {
                            autoCorrect();
                        }
                    });
                }

            };
        }
    ]);
