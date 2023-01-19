angular.module('Realize.calendar.calendarService', [
    'Realize.assignment.facadeService',
    'Realize.paths',
    'realize.core.isoDateService',
    'Realize.calendar.calendarEvent',
    'rlzComponents.components.i18n'
])
    .service('CalendarService', [
        '$log',
        '$http',
        'AssignmentFacadeService',
        '$routeParams',
        'CalendarEvent',
        'REST_PATH',
        'Messages',
        '$q',
        'ISODateService',
        function($log, $http, AssignmentFacadeService, $routeParams, CalendarEvent, REST_PATH, Messages, $q,
                 ISODateService) {
            'use strict';

            this.openTeacherPreview = function(event) {
                var path = ['/classes', $routeParams.classId, 'calendar', event.id, 'preview'].join('/');
                AssignmentFacadeService.preview(path);
            };

            this.getEventDetails = function(itemId) {
                var url, promise;
                url = REST_PATH + '/events/' + itemId;
                promise = $http.get(url, {'params': {'includeItem':true}})
                    .then(function(response) {
                        return new CalendarEvent(response.data);
                    }, function(err) {
                        return $q.reject('Failed to get event details: ', err);
                    });

                return promise;
            };

            this.getMonthViewRange = function(refDateObj) {
                var dateObj = refDateObj.clone(),
                    firstDay = dateObj.moveToFirstDayOfMonth().clone(),
                    lastDay = dateObj.moveToLastDayOfMonth().clone();

                //Move to first Sunday - last Sunday of month-view
                if (!firstDay.is().sunday()) {
                    firstDay.prev().sunday();
                }

                if (!lastDay.is().saturday()) {
                    lastDay.saturday();
                }

                return {
                    firstSunday: firstDay,
                    lastSaturday: lastDay
                };
            };

            this.getWeekViewRange = function(refDateObj) {
                var dateObj = refDateObj.clone();

                //Move to Sunday before getting date range
                if (!dateObj.is().sunday()) {
                    dateObj.prev().sunday();
                }

                return {
                    sunday: dateObj,
                    saturday: dateObj.clone().saturday()
                };
            };

            this.getDateRange = function(refDateObj, viewType) {
                var dateRange, dateObj = refDateObj.clone();

                //+1 to end date because REST call is end date exclusive
                if (viewType === 'basicWeek') {
                    var weekView = this.getWeekViewRange(dateObj);

                    dateRange = {
                        startDate: ISODateService.toDateStringWithZone(weekView.sunday),
                        endDate: ISODateService.toDateStringWithZone(weekView.saturday.add(1).days())
                    };
                } else {
                    var monthView = this.getMonthViewRange(dateObj);

                    dateRange = {
                        startDate: ISODateService.toDateStringWithZone(monthView.firstSunday),
                        endDate: ISODateService.toDateStringWithZone(monthView.lastSaturday.add(1).days())
                    };
                }
                return dateRange;
            };

            this.isSameDate = function(start, end) {
                return start.toString('MM/dd/yyyy') === end.toString('MM/dd/yyyy');
            };

            this.getDayName = function(date) {
                var dayNames = Messages.getMessagesAsArray('calendar.dayNames');
                return dayNames[date.getDay()];
            };

            this.getMonthName = function(date) {
                var monthNames = Messages.getMessagesAsArray('calendar.monthNames');
                return monthNames[date.getMonth()];
            };

            this.formatDate = function(date, isTimed) {
                var formattedDate = [
                    this.getDayName(date) + ',',
                    this.getMonthName(date),
                    date.toString('dd')
                ].join(' ');

                if (isTimed) {
                    formattedDate += [' |', date.toString('h:mm tt')].join(' ');
                }

                return formattedDate;
            };

            this.formatEventTimes = function(event) {
                var startDate = event.parsedStart.clone(),
                    endDate = event.parsedEnd.clone(),
                    isTimed = event.isTimed();

                if (event.isAssignment()) {
                    return this.formatDate(endDate);
                }

                if (this.isSameDate(startDate, endDate)) {
                    if (isTimed) {
                        return this.formatDate(startDate, true) + ' - ' + endDate.toString('h:mm tt');
                    }

                    return this.formatDate(startDate);
                }

                return this.formatDate(startDate, isTimed) + ' - ' + this.formatDate(endDate, isTimed);
            };

            this.getSelectedClassIds = function(classes) {
                var selectedClasses = _.filter(classes, function(item) {
                    return item.selected === true;
                });

                return _.pluck(selectedClasses, 'classId');
            };

            this.getEvents = function(classId, params) {
                var url = [REST_PATH, 'classes', classId, 'events'].join('/');

                var promise = $http.get(url, {params: params})
                    .then(function(response) {
                        var calendarEvents = [];

                        _.each(response.data, function(calEvent) {
                            calendarEvents.push(new CalendarEvent(calEvent));
                        });

                        return calendarEvents;
                    }, function(err) {
                        $log.error(err);
                        return $q.reject('Failed to get events: ', err);
                    });

                return promise;
            };

            this.getHours = function() {
                var i, hours = [];

                var getAMorPM = function(index) {
                    return index < 12 ? 'am' : 'pm';
                };

                for (i = 0; i < 24; i++) {
                    var hour = i % 12, hourString = '';

                    hourString = (hour === 0 ? '12' : hour) + ':00 ' + getAMorPM(i);

                    hours.push(hourString);
                }

                return hours;
            };
        }]);
