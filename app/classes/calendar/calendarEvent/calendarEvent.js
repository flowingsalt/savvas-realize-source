angular.module('Realize.calendar.calendarEvent', [
        'Realize.filters.ellipses',
        'Realize.paths',
        'Realize.content'
    ])
    .factory('CalendarEvent', [
        '$rootScope',
        '$filter',
        'Content',
        '$log',
        '$http',
        'PATH',
        '$q',
        function($rootScope, $filter, Content, $log, $http, PATH, $q) {
            'use strict';

            var getTruncatedTitle = function(fullTitle) {
                var weekendCharMax = 15;
                var noWeekendCharMax = 25;

                if ($rootScope.currentUser.getAttribute('classCalendar.view') === 'month') {
                    var characterLimit = $rootScope.currentUser.getAttribute('classCalendar.showWeekends') ?
                        weekendCharMax : noWeekendCharMax;
                    return $filter('ellipses')(fullTitle, characterLimit);
                }
                return fullTitle;
            };

            var EVENT_TYPE = {
                ASSIGNMENT: 'ASSIGNMENT',
                TIMED: 'TIMED',
                ALL_DAY: 'ALL_DAY'
            };

            function CalendarEvent(json) {
                var eventTemplate = {
                    // properties used by fullcalendar
                    id: '',
                    start: '',
                    end: '',
                    title: '',
                    className: '',
                    contentItem: '',

                    // used for a11y. space before javascript needed to pass jslint
                    url: ' javascript://',

                    // custom properties
                    // necessary for title truncation logic
                    fullTitle: json.title,
                    parsedStart: $.fullCalendar.parseISO8601(json.start),
                    parsedEnd: $.fullCalendar.parseISO8601(json.end)
                };

                angular.extend(eventTemplate, json);

                // overwrite with proper display title
                eventTemplate.title = getTruncatedTitle(json.title);

                if (json.eventType === EVENT_TYPE.ASSIGNMENT) {
                    //assignments should only appear on due date
                    eventTemplate.start = json.end;

                    //update parsedStart based on new value of start
                    eventTemplate.parsedStart = $.fullCalendar.parseISO8601(eventTemplate.start);
                    eventTemplate.className = 'assignment-content';
                } else {
                    eventTemplate.className = 'event-content';
                }

                if (eventTemplate.contentItem) {
                    var assignmentContentItem = new Content(eventTemplate.contentItem);
                    //add props from original contentItem back to new Content instance
                    angular.extend(assignmentContentItem, eventTemplate.contentItem);

                    assignmentContentItem.planningMaterialItems =
                        Object.keys(assignmentContentItem.planningMaterialItems || {})
                            .map(function(materialKey) {
                                var material = assignmentContentItem.planningMaterialItems[materialKey],
                                    newMaterial = new Content(material);
                                //add props from original material item back to new Content instance
                                angular.extend(newMaterial, material);
                                return newMaterial;
                            });
                    eventTemplate.contentItem = assignmentContentItem;
                }

                angular.extend(this, eventTemplate);
            }

            CalendarEvent.EVENT_TYPE = EVENT_TYPE;

            CalendarEvent.prototype.updateTruncatedTitle = function() {
                var self = this;
                self.title = getTruncatedTitle(self.fullTitle);
            };

            CalendarEvent.prototype.create = function() {
                var self = this,
                    url = PATH.REST + '/events';

                // override display title with full title for POST
                self.title = self.fullTitle;

                return $http.post(url, self)
                    .then(function(response) {
                        return response;
                    }, function(err) {
                        $log.error(err);
                        return $q.reject('Failed to create event: ', err);
                    });
            };

            CalendarEvent.prototype.edit = function(eventId) {
                var self = this,
                    url = [PATH.REST, 'events', eventId].join('/');

                // override display title with full title for update
                self.title = self.fullTitle;

                /**
                 * TODO: this property breaks POST.
                 * this line can be removed when backend is updated to handle assignedTo correctly
                 */
                delete self.assignedTo;

                return $http.post(url, self)
                    .then(function(response) {
                        return response;
                    }, function(err) {
                        $log.error(err);
                        return $q.reject('Failed to edit event: ', err);
                    });
            };

            CalendarEvent.prototype.remove = function(classId) {
                var self = this,
                    url = [PATH.REST, 'events', self.id, 'assignees', 'classes', classId].join('/');

                return $http({
                        method: 'DELETE',
                        url: url
                    })
                    .then(function(response) {
                        return response;
                    }, function(err) {
                        $log.error(err);
                        return $q.reject('Failed to remove event: ', err);
                    });
            };

            CalendarEvent.prototype.undoRemove = function(classId) {
                var self = this,
                    url = [PATH.REST, 'events', self.id, 'assignees', 'classes', classId].join('/');

                return $http.put(url)
                    .then(function(response) {
                        return response;
                    }, function(err) {
                        $log.error(err);
                        return $q.reject('Failed to undo remove event: ', err);
                    });
            };

            CalendarEvent.prototype.isAssignment = function() {
                var self = this;
                return self.eventType === CalendarEvent.EVENT_TYPE.ASSIGNMENT;
            };

            CalendarEvent.prototype.isTimed = function() {
                var self = this;
                return self.eventType === CalendarEvent.EVENT_TYPE.TIMED;
            };

            CalendarEvent.prototype.isAllDay = function() {
                var self = this;
                return self.eventType === CalendarEvent.EVENT_TYPE.ALL_DAY;
            };

            return CalendarEvent;
        }
    ]);
