angular.module('Realize.calendar.calendarEventModal', [
    'ModalServices',
    'rlzComponents.components.i18n',
    'realize.core.isoDateService',
    'Realize.paths',
    'RealizeDataServices', // for RangeDatepickerOptions - will be deprecated soon
    'RealizeApp', // for DatepickerUtil - will be deprecated soon
    'Realize.calendar.calendarService',
    'Realize.calendar.calendarEvent'
])
    .directive('calendarEventModal', [
        '$log',
        'Modal',
        'lwcI18nFilter',
        'CalendarEvent',
        'CalendarService',
        '$routeParams',
        'ISODateService',
        'RangeDatepickerOptions',
        'DatepickerUtil',
        'PATH',
        function($log, Modal, lwcI18nFilter, CalendarEvent, CalendarService, $routeParams, ISODateService,
                 RangeDatepickerOptions, DatepickerUtil, PATH) {
            'use strict';

            return {
                link: function(scope, element, attrs) {
                    var $scope = null,
                        calendarEventClickHandler,
                        elementsToCleanUp = [element];

                    calendarEventClickHandler = function(e) {
                        e.preventDefault();
                        e.stopPropagation();

                        $scope = scope.$new(true);

                        if (!attrs.mode || !attrs.classRosters || !attrs.preSelectedClassIds) {
                            return $log.error('calendarEventModal.dir - Missing Attribute!');
                        }

                        $scope.mode = attrs.mode;

                        // Time Selection Dropdown
                        $scope.hours = CalendarService.getHours();

                        $scope.startTime = $scope.endTime = $scope.hours[0];

                        var updateEndTime = function() {
                            if ($scope.hourIsDisabled($scope.hours.indexOf($scope.endTime))) {
                                $scope.endTime = $scope.startTime;
                            }
                        };

                        $scope.hourIsDisabled = function(indexOfHour) {
                            var sameDateSelected = $scope.event && $scope.event.startDate === $scope.event.endDate,
                            endTimeBeforeStartTime = indexOfHour < $scope.hours.indexOf($scope.startTime);

                            return sameDateSelected && endTimeBeforeStartTime;
                        };

                        $scope.selectStartTime = function(selectedTime) {
                            $scope.startTime = selectedTime;
                            updateEndTime();
                        };

                        $scope.selectEndTime = function(selectedTime) {
                            $scope.endTime = selectedTime;
                        };
                        var rangeDatepickerOptions = new RangeDatepickerOptions('#start-date', '#end-date');

                        $scope.startDatepickerOptions = rangeDatepickerOptions.start;
                        $scope.endDatepickerOptions = rangeDatepickerOptions.end;

                        var onSelectDate = function() {
                            $scope.$evalAsync(updateEndTime);
                        };

                        $scope.startDatepickerOptions.$setOnSelect(onSelectDate);
                        $scope.endDatepickerOptions.$setOnSelect(onSelectDate);

                        // Add set before data
                        $scope.startDatepickerOptions.$setBeforeShow(function() {
                            var startDateElem = angular.element('#start-date').datepicker();
                            startDateElem.on('keydown', function(e) {
                                DatepickerUtil.customizedKeydownEventForDatepicker(e, '#start-date');
                            });
                            elementsToCleanUp.push(startDateElem);
                        });

                        $scope.endDatepickerOptions.$setBeforeShow(function() {
                            var endDateElem = angular.element('#end-date').datepicker();
                            endDateElem.on('keydown', function(e) {
                                DatepickerUtil.customizedKeydownEventForDatepicker(e, '#end-date');
                            });
                            elementsToCleanUp.push(endDateElem);
                        });

                        // typeAndSelect data
                        // copy classRosters so that typeAndSelect does not modify original data
                        $scope.classRosters = angular.copy(scope.$eval(attrs.classRosters));

                        var preSelectedIds = scope.$eval(attrs.preSelectedClassIds);
                        $scope.preSelectedClassRosters = _.filter($scope.classRosters, function(classRoster) {
                            return _.contains(preSelectedIds, classRoster.classId);
                        });

                        $scope.typeAndSelectConfig = {
                            results: $scope.classRosters,
                            formText: {
                                mainLabel: lwcI18nFilter('calendar.eventForm.chooseClasses.label'),
                                help: lwcI18nFilter('calendar.eventForm.chooseClasses.help'),
                                noMatch: lwcI18nFilter('calendar.eventForm.chooseClasses.alert.noMatch'),
                                submitError: lwcI18nFilter('calendar.eventForm.chooseClasses.alert.missingClasses'),
                                addAllLabel: lwcI18nFilter('calendar.eventForm.chooseClasses.addAllClasses'),
                                offScreenRemove: lwcI18nFilter('calendar.eventForm.chooseClasses.removeClass.a11y'),
                                placeholder: lwcI18nFilter('calendar.eventForm.chooseClasses.placeholder')
                            },
                            isAddAllEnabled: true,
                            isFormSubmitted: function() {
                                return $scope.savePressed;
                            },
                            customFilter: function($viewValue) {
                                return {
                                    className: $viewValue
                                };
                            },
                            preSelectedItems: $scope.preSelectedClassRosters,
                            hideRemoveIcon: function(item) {
                                return $scope.mode === 'edit' && item.preSelected;
                            }
                        };

                        $scope.popupMatchTmplUrl = PATH.TEMPLATE_CACHE +
                            '/app/classes/calendar/calendarEvent/calendarEventModalTypeaheadMatch.html';

                        $scope.selectedItemTmplUrl = PATH.TEMPLATE_CACHE +
                            '/app/classes/calendar/calendarEvent/calendarEventModalSelectedItem.html';

                        // Button Controls
                        $scope.close = function() {
                            Modal.hideDialog();
                            $scope.$destroy();
                        };

                        $scope.saveEvent = function() {
                            $scope.savePressed = true;

                            var selectedClasses = CalendarService.getSelectedClassIds($scope.classRosters);

                            // proceed if required fields are valid && there is at least one class selected by teacher
                            if ($scope.eventForm.$valid && selectedClasses.length > 0) {
                                $scope.isInProgress = true;

                                $scope.event.selectedClasses = selectedClasses;

                                var start = $scope.event.startDate,
                                end = $scope.event.endDate;

                                if (!$scope.event.allDay) {
                                    // appending times to dates.
                                    start += ' ' + $scope.startTime;
                                    end += ' ' + $scope.endTime;
                                    $scope.event.eventType = 'TIMED';
                                    $scope.event.start = ISODateService.toDateTimeString(new Date(start));
                                    $scope.event.end = ISODateService.toDateTimeString(new Date(end));
                                } else {
                                    $scope.event.eventType = 'ALL_DAY';
                                    $scope.event.start = ISODateService.toDateString(new Date(start));
                                    $scope.event.end = ISODateService.toDateString(new Date(end));
                                }

                                var saveCompleted;
                                if ($scope.mode === 'create') {
                                    var calendarEvent = new CalendarEvent($scope.event);
                                    saveCompleted = calendarEvent.create();

                                } else if ($scope.mode === 'edit') {
                                    saveCompleted = $scope.event.edit($routeParams.itemId);
                                }

                                var saveCompleteHandler = function(outcome) {
                                    $scope.$emit('calendar.' + $scope.mode.toLowerCase() + outcome);
                                    $scope.inProgress = false;
                                    $scope.close();
                                };

                                saveCompleted.then(function() {
                                    saveCompleteHandler('Success');
                                }, function() {
                                    saveCompleteHandler('Failed');
                                });
                            }
                        };

                        Modal.showDialog(PATH.TEMPLATE_CACHE +
                            '/app/classes/calendar/calendarEvent/calendarEventModal.html',
                            $scope)
                            .then(function() {
                                if ($scope.mode === 'edit') {
                                    $scope.event = angular.copy(scope.$eval(attrs.existingEvent));

                                    // Pre-populate hours
                                    var getHour = function(date) {
                                        var zeroIndexedHour = date.getHours();
                                        return $scope.hours[zeroIndexedHour];
                                    };

                                    $scope.selectStartTime(getHour($scope.event.parsedStart));
                                    $scope.selectEndTime(getHour($scope.event.parsedEnd));

                                    // Pre-populate all day checkbox
                                    $scope.event.allDay = $scope.event.isAllDay();

                                    // Pre-populate datepicker
                                    $scope.event.startDate = $scope.event.parsedStart.toString('MM/dd/yyyy');

                                    $scope.event.endDate = $scope.event.parsedEnd.toString('MM/dd/yyyy');
                                }
                            });

                        scope.$evalAsync();
                    };

                    element.on('click', calendarEventClickHandler);

                    scope.$on('$destroy', function() {
                        elementsToCleanUp.forEach(function(element) {
                            element.off();
                        });
                        elementsToCleanUp = null;
                    });
                }
            };
        }
    ]);
