angular.module('Realize.calendar.calendarEventCtrl', [
    'RealizeDataServices', //for ClassRosters - will be deprecated soon
    'Realize.common.alerts',
    'rlzComponents.components.i18n',
    'Realize.assignment.utilService',
    'Realize.calendar.calendarService',
    'Realize.calendar.calendarEvent'
])
    .controller('CalendarEventCtrl', [
        '$scope',
        '$location',
        'CalendarService',
        'CurrentRoster',
        'myCalendarEvent',
        '$routeParams',
        'ClassRosters',
        'lwcI18nFilter',
        'AlertService',
        'GroupData',
        'AssignmentUtil',
        function($scope, $location, CalendarService, CurrentRoster, myCalendarEvent, $routeParams, ClassRosters,
                 lwcI18nFilter, AlertService, GroupData, AssignmentUtil) {
            'use strict';

            $scope.item = myCalendarEvent;

            $scope.roster = CurrentRoster;

            var assignedTo = $scope.item.assignedTo,
                classId = CurrentRoster.classId;

            var assigneeIds = AssignmentUtil.getAssigneeIdsFromItemAssignedToCollection(assignedTo, classId);

            $scope.assigneeList = AssignmentUtil.getAssigneeList(assigneeIds, CurrentRoster, GroupData);

            $scope.isTimedOrAllDay = myCalendarEvent.isTimed() || myCalendarEvent.isAllDay();

            $scope.timesForDisplay = CalendarService.formatEventTimes(myCalendarEvent);

            $scope.openTeacherPreview = CalendarService.openTeacherPreview;

            $scope.open = function(event, item) {
                event.preventDefault();
                event.stopPropagation();

                var p = $location.path();
                $location.path([p, 'content', item.id, item.version].join('/'));
            };

            $scope.back = function(event) {
                event.stopPropagation();
                event.preventDefault();

                var path = $location.path(),
                    next = path.split('/calendar/')[0] + '/calendar';

                $location.path(next);
            };

            var errorHandler = function() {
                $scope.serverError = true;
            };

            $scope.remove = function() {
                $scope.item.remove($routeParams.classId).then(function() {
                    $scope.item.isRemoved = true;
                }, errorHandler);
            };

            $scope.undoRemove = function() {
                $scope.item.undoRemove($routeParams.classId).then(function() {
                    $scope.item.isRemoved = false;
                }, errorHandler);
            };

            var getPreSelectedClassIds = function() {
                return _.pluck($scope.item.assignedTo, 'classUuid');
            };

            if ($scope.isTimedOrAllDay) {
                $scope.editEventModal = {
                    preSelectedClassIds: getPreSelectedClassIds(),
                    classRosters: _.map(ClassRosters, function(roster) {
                        return _.pick(roster, 'className', 'classId');
                    })
                };
            }

            $scope.$on('calendar.editSuccess', function() {
                CalendarService.getEventDetails($routeParams.itemId)
                    .then(function(updatedCalendarEvent) {
                        var successEditEventAlertMsg =
                        ['<strong>', lwcI18nFilter('calendar.itemDetails.editEvent.successNotification.title'),
                         '</strong>', lwcI18nFilter('calendar.itemDetails.editEvent.successNotification.message')
                        ].join(' ');

                        AlertService.addAlert('success', 'ok-sign', successEditEventAlertMsg);

                        $scope.alertDetails = AlertService.alerts[0];
                        $scope.alertIsSet = AlertService.alertIsSet();

                        $scope.item = updatedCalendarEvent;
                        $scope.timesForDisplay = CalendarService.formatEventTimes(updatedCalendarEvent);
                        $scope.editEventModal.preSelectedClassIds = getPreSelectedClassIds();
                    });
            });

            $scope.$on('calendar.editFailed', function() {
                var messagePath = 'calendar.itemDetails.editEvent.errorNotification.generic.message';
                var errorEditEventAlertMsg = lwcI18nFilter(messagePath);

                AlertService.addAlert('error', 'exclamation-sign', errorEditEventAlertMsg);

                $scope.alertDetails = AlertService.alerts[0];
                $scope.alertIsSet = AlertService.alertIsSet();
            });
        }]);
