angular.module('Realize.calendar.classCalendarCtrl', [
    'rlzComponents.components.i18n',
    'RealizeDataServices', // for DatepickerOptions - will be deprecated soon
    'Realize.common.alerts',
    'Realize.common.keyboardSupport.keyCodes',
    'Realize.calendar.calendarService',
    'Realize.calendar.calendarEvent',
    'Realize.calendar.eventSource'
])
    .controller('ClassCalendarCtrl', [
        '$scope',
        'CalendarService',
        'CalendarEvents',
        'lwcI18nFilter',
        'Messages',
        '$routeParams',
        'ClassRosters',
        'AlertService',
        '$location',
        'EventSource',
        'KEY_CODES',
        '$timeout',
        'DatepickerOptions',
        function($scope, CalendarService, CalendarEvents, lwcI18nFilter, Messages, $routeParams, ClassRosters,
                 AlertService, $location, EventSource, KEY_CODES, $timeout, DatepickerOptions) {
            'use strict';

            var today = new Date(), thisYear = today.getFullYear(), thisMonth = today.getMonth();

            var showEventPage = function(e, calEvent) {
                var path = $location.path() + '/' + calEvent.id;
                $location.path(path);
            };

            $scope.calendarConfig = {
                defaultView: $scope.currentUser.getAttribute('classCalendar.view') || 'month',
                weekends: !!$scope.currentUser.getAttribute('classCalendar.showWeekends'),
                header: false,
                weekMode: 'variable',
                titleFormat: {
                    month: 'MMMM yyyy',
                    basicWeek: 'MMMM d{ &#8212; MMMM d}'
                },
                monthNames: Messages.getMessagesAsArray('calendar.monthNames'),
                dayNames: Messages.getMessagesAsArray('calendar.dayNames'),
                columnFormat: {
                    month: 'dddd',
                    basicWeek: 'dddd d'
                },
                ignoreTimezone: false,
                viewDisplay: function(view) {
                    $scope.calendarTitle = view.title.replace(/&#8212;/g, '-');
                },
                eventClick: function(calEvent, e) {
                    showEventPage(e, calEvent);
                    $scope.$applyAsync();
                },
                eventRender: function(calEvent, el) {
                    //a11y - register keylistener for events
                    var $el = angular.element(el);
                    $el.on('keydown', function(e) {
                        if (e.which === KEY_CODES.ENTER) {
                            showEventPage(e, calEvent);
                            $scope.$applyAsync();
                        }
                    });
                    $scope.$on('$destroy', function() {
                        $el.off();
                    });
                }
            };

            if (!$scope.currentUser.getAttribute('classCalendar.view')) {
                $scope.currentUser.setAttribute('classCalendar.view', $scope.calendarConfig.defaultView);
            }

            var calendarEventSource;

            if ($scope.currentUser.getAttribute('classCalendar.currentRefDate')) {
                var calendarWithDate = $scope.currentUser.getAttribute('classCalendar.currentRefDate');
                calendarEventSource = new EventSource(CalendarEvents, calendarWithDate);
                $scope.calendarConfig.month = calendarWithDate.getMonth();
                $scope.calendarConfig.date = calendarWithDate.getDate();
                $scope.calendarConfig.year = calendarWithDate.getFullYear();
            } else {
                calendarEventSource = new EventSource(CalendarEvents);
            }

            // ui-calendar requires array of EventSource objects
            $scope.eventSources = [calendarEventSource];

            var redrawCalendar = function(targetDate) {
                /**
                 * need to persist eventSources - property is
                 * deleted after calling .fullCalendar(configObj)
                 */
                $scope.calendarConfig.eventSources = $scope.eventSources;

                $scope.classCalendar.fullCalendar('destroy');
                $scope.classCalendar.fullCalendar($scope.calendarConfig);

                // need to persist current view date - goes back to today on init
                $scope.classCalendar.fullCalendar('gotoDate', targetDate);
            };

            var updateEventsData = function(referenceDate) {
                var viewType = $scope.currentUser.getAttribute('classCalendar.view'),
                    dateRange = CalendarService.getDateRange(referenceDate, viewType);

                $scope.currentUser.setAttribute('classCalendar.currentRefDate', referenceDate, false);

                return CalendarService.getEvents($routeParams.classId, {
                    start: dateRange.startDate,
                    end: dateRange.endDate
                })
                    .then(function(calEventsData) {
                        calendarEventSource = new EventSource(calEventsData, referenceDate);
                        $scope.eventSources = [calendarEventSource];
                        redrawCalendar(referenceDate);
                    });
            };

            var getReferenceDate = function(direction) {
                var referenceDate = $scope.classCalendar.fullCalendar('getDate'),
                    viewType = $scope.currentUser.getAttribute('classCalendar.view'),

                    //Adding/Subtracting month/week
                    modifier = direction === 'next' ? 1 : -1;
                if (viewType === 'month') {
                    referenceDate.addMonths(modifier).moveToFirstDayOfMonth();
                } else {
                    referenceDate.addWeeks(modifier);
                }
                return referenceDate;
            };

            $scope.changeCalendarView = function(viewName) {
                $scope.calendarConfig.defaultView = viewName;
                $scope.currentUser.setAttribute('classCalendar.view', viewName);
                var referenceDate = $scope.classCalendar.fullCalendar('getDate');

                // Switching from week to month, need to get more events data
                if (viewName === 'month') {
                    updateEventsData(referenceDate).then(function() {
                        $scope.classCalendar.fullCalendar('changeView', viewName);
                    });
                } else {
                    $scope.classCalendar.fullCalendar('changeView', viewName);
                    calendarEventSource.updateVisibleEvents(referenceDate);
                    calendarEventSource.truncateEventTitles();
                    $scope.classCalendar.fullCalendar('refetchEvents');

                    var viewDate = $scope.classCalendar.fullCalendar('getDate'),
                        viewYear = viewDate.getFullYear(),
                        viewMonth = viewDate.getMonth();
                    if (viewYear === thisYear && viewMonth === thisMonth) {
                        $scope.classCalendar.fullCalendar('gotoDate', today);
                        referenceDate = $scope.classCalendar.fullCalendar('getDate');
                    }

                    $scope.currentUser.setAttribute('classCalendar.currentRefDate', referenceDate, false);
                }
            };

            $scope.toggleWeekends = function() {
                $scope.calendarConfig.weekends = !$scope.calendarConfig.weekends;
                $scope.currentUser.setAttribute('classCalendar.showWeekends', $scope.calendarConfig.weekends);

                calendarEventSource.truncateEventTitles();

                //re-render calendar
                var currentViewDate =  $scope.classCalendar.fullCalendar('getDate');
                redrawCalendar(currentViewDate);
            };

            $scope.goToPrevious = function() {
                updateEventsData(getReferenceDate('prev'));
            };

            $scope.goToNext = function() {
                updateEventsData(getReferenceDate('next'));
            };

            $scope.filters = {
                showDate: Date.today().toString('MM/dd/yyyy')
            };

            $scope.dateOptions = new DatepickerOptions('#weekSelection');

            $scope.dateOptions.$setBeforeShow(function(element, inst) {
                var $picker = $('#ui-datepicker-div');

                $picker.addClass('rlz-weekpicker');

                // switch hover from day to week
                $picker.on('mousemove', '.ui-datepicker-calendar tbody tr', function() {
                    $(this).addClass('ui-state-hover');
                });

                $picker.on('mouseleave', '.ui-datepicker-calendar tbody tr', function() {
                    $(this).removeClass('ui-state-hover');
                });

                inst.input.datepicker('setDate', $scope.classCalendar.fullCalendar('getDate'));
            });

            $scope.dateOptions.$setOnClose(function(selectedDate) {
                if (selectedDate) {
                    $scope.$applyAsync(function() {
                        $scope.filters.showDate = new Date(selectedDate).toString('MM/dd/yyyy');
                        var selectedDateObj  = new Date(selectedDate);
                        updateEventsData(selectedDateObj);
                    });
                }

                //remove class/listeners for week selection
                var $picker = $('#ui-datepicker-div');
                $picker.removeClass('rlz-weekpicker');
                $picker.off('mousemove', '.ui-datepicker-calendar tbody tr');
                $picker.off('mouseleave', '.ui-datepicker-calendar tbody tr');
            });

            $scope.dateOptions.$setOnSelect(function() {
                var $activeDayPicker = $('a.ui-state-active');
                $activeDayPicker.removeClass('ui-state-active');
            });

            var additionalDPConfig = {
                gotoCurrent: true,
                showAnim: '',
                onChangeMonthYear: function() {
                    /**
                     * $timeout is used to delay while applying the weekly highlight.
                     * When the datepicker is displayed, it sets up the current Date and
                     * hence overrides the style for highligting a week.
                     */
                    var timer = $timeout(function() {
                        $scope.$broadcast('datepicker.showWeeklyHighlight');
                    }, 1, false);
                    $scope.$on('$destroy', function destroy() {
                        $timeout.cancel(timer);
                    });
                }
            };

            angular.extend($scope.dateOptions, additionalDPConfig);

            $scope.createEventModal = {
                //must be an array
                preSelectedClassIds: [$routeParams.classId],
                classRosters: _.map(ClassRosters, function(roster) {
                    return _.pick(roster, 'className', 'classId');
                })
            };

            $scope.$on('calendar.createSuccess', function() {
                var referenceDate = $scope.classCalendar.fullCalendar('getDate');
                return updateEventsData(referenceDate).then(function() {
                    var successCreateEventAlertMsg =
                    ['<strong>', lwcI18nFilter('calendar.createEvent.successNotification.title'), '</strong>',
                        lwcI18nFilter('calendar.createEvent.successNotification.message')].join(' ');

                    AlertService.addAlert('success', 'ok-sign', successCreateEventAlertMsg);

                    $scope.alertDetails = AlertService.alerts[0];
                    $scope.alertIsSet = AlertService.alertIsSet();
                });
            });

            $scope.$on('calendar.createFailed', function() {
                var msgPath = 'calendar.createEvent.errorNotification.generic.message';
                var successCreateEventAlertMsg = lwcI18nFilter(msgPath);

                AlertService.addAlert('error', 'exclamation-sign', successCreateEventAlertMsg);

                $scope.alertDetails = AlertService.alerts[0];
                $scope.alertIsSet = AlertService.alertIsSet();
            });

            $scope.navigationFallback = '/classes';
        }]);
