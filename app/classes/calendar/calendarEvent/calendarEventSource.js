angular.module('Realize.calendar.eventSource', [
    'Realize.calendar.calendarService'
])
    .factory('EventSource', [
        '$rootScope',
        'CalendarService',
        function($rootScope, CalendarService) {
            'use strict';

            var calcCalendarCells = function(calEvent, referenceDate) {

                var eventStart = calEvent.parsedStart.clone(),
                    eventEnd = calEvent.parsedEnd.clone(),
                    monthView = CalendarService.getMonthViewRange(referenceDate);

                // stay within scope of current month view
                if (eventStart.getTime() < monthView.firstSunday.getTime()) {
                    eventStart = monthView.firstSunday;
                }

                if (eventEnd.getTime() > monthView.lastSaturday.getTime()) {
                    eventEnd = monthView.lastSaturday;
                }

                // each event takes up at least 1 cell
                var calendarCells = 1;

                if (eventStart.getMonth() === eventEnd.getMonth()) {
                    calendarCells += eventEnd.getDate() - eventStart.getDate();
                } else {
                    var lastDayOfMonth = new Date(eventStart.getFullYear(), eventStart.getMonth() + 1, 0),
                        currentMonthCells = lastDayOfMonth.getDate() - eventStart.getDate(),
                        nextMonthSpillover = eventEnd.getDate();

                    calendarCells += currentMonthCells + nextMonthSpillover;
                }

                calEvent.calendarCells = calendarCells;
            };

            var sortedEventsByCellNum = function(calEvents, referenceDate) {
                _.each(calEvents, function(calEvent) {
                    calcCalendarCells(calEvent, referenceDate);
                });

                //returns events from greatest number of cells to lowest
                return _.sortBy(calEvents, function(calEvent) {
                    return calEvent.calendarCells * -1;
                });
            };

            var displayAssignmentsLast = function(calEvents) {
                var isAssignment = function(calEvent) {
                    return calEvent.eventType === 'ASSIGNMENT';
                };

                var assignments = _.filter(calEvents, isAssignment);
                _.each(assignments, function(assignment) {
                    /**
                     * give assignments the last hour + min + sec of day
                     * fullcalendar orders by time, which guarantees assignments are
                     * displayed after events since events do not have min/sec, per current AC
                     */
                    var startTime = 'T00:00:00';
                    var lastTime = 'T23:59:59';
                    assignment.start = assignment.start.replace(startTime, lastTime);
                    assignment.end = assignment.start.replace(startTime, lastTime);
                });
            };

            var isolateVisibleEvents = function(visibleEvents, hiddenEvents, referenceDate) {
                if ($rootScope.currentUser.getAttribute('classCalendar.view') === 'month') {
                    var visible = [],
                        hidden = [],
                        cellToOccupantCount = {},
                        monthView = CalendarService.getMonthViewRange(referenceDate),
                        sortedCalEvents = sortedEventsByCellNum(visibleEvents, referenceDate),
                        maxNumVisible = 15;

                    _.each(sortedCalEvents, function(calEvent) {
                        var currentDay = calEvent.parsedStart.clone();

                        //stay within scope of current month view
                        if (currentDay.getTime() < monthView.firstSunday.getTime()) {
                            currentDay = new Date(monthView.firstSunday);
                        }

                        var i, isHidden = false;
                        for (i = 0; i < calEvent.calendarCells; i++) {
                            var currentCell = currentDay.toString('yyyy-MM-dd');

                            if (cellToOccupantCount[currentCell]) {
                                cellToOccupantCount[currentCell]++;
                            } else {
                                cellToOccupantCount[currentCell] = 1;
                            }

                            if (cellToOccupantCount[currentCell] > maxNumVisible) {
                                isHidden = true;
                                hidden.push(calEvent);
                            }

                            // move forward 1 day
                            currentDay.add(1).days();
                        }

                        if (!isHidden) {
                            visible.push(calEvent);
                        }
                    });

                    return {
                        visibleEvents: visible,
                        hiddenEvents: hidden
                    };
                }

                return {
                    // all events are visible in week view
                    visibleEvents: visibleEvents.concat(hiddenEvents),
                    hiddenEvents: []
                };
            };

            function EventSource(events, referenceDate) {
                displayAssignmentsLast(events);
                var eventDetails = isolateVisibleEvents(events, [], referenceDate || new Date());

                var eventSourceTemplate = {
                    // properties used by fullCalendar
                    events: eventDetails.visibleEvents,

                    // custom
                    hiddenEvents: eventDetails.hiddenEvents
                };

                angular.copy(eventSourceTemplate, this);
            }

            EventSource.prototype.truncateEventTitles = function() {
                var self = this;

                angular.forEach(self.events, function(event) {
                    event.updateTruncatedTitle();
                });
            };

            EventSource.prototype.updateVisibleEvents = function(referenceDate) {
                var self = this;
                var eventDetails = isolateVisibleEvents(self.events, self.hiddenEvents, referenceDate);

                self.events = eventDetails.visibleEvents;
                self.hiddenEvents = eventDetails.hiddenEvents;
            };

            return EventSource;
        }]);
