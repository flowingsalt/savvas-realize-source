angular.module('Realize.assignment.zeroState', [
    'Realize.analytics',
    'Realize.assignment.zeroStateService',
    'Realize.constants.googleClassroom',
    'rlzComponents.components.googleClassroom',
    'Realize.user.currentUser'
])
    .directive('assignmentsZeroState', [
        '$log',
        '$location',
        'AssignmentZeroStateService',
        '$rootScope',
        'GOOGLE_CLASSROOM',
        'googleClassroomService',
        'currentUser',
        function($log, $location, AssignmentZeroStateService, $rootScope, GOOGLE_CLASSROOM,
                 googleClassroomService, currentUser) {
            'use strict';

            return {
                scope: {
                    assignmentData: '=',
                    currentRoster: '=classRosterData'
                },
                templateUrl: 'templates/assignment/teacher/assignments_zero_state.html',
                link: function(scope) {

                    scope.location = $location;
                    scope.currentUser = currentUser;

                    scope.hasZeroState = function() {
                        return _.any(scope.zeroState);
                    };

                    var calculateZeroState = function() {
                        if (scope.studentsList && scope.assignmentsCount) {
                            scope.zeroState = AssignmentZeroStateService.calculateZeroState({
                                classId: scope.currentRoster.classId,
                                studentsList: scope.studentsList,
                                classPrograms: scope.currentRoster.productIds,
                                assignmentsCount: scope.assignmentsCount
                            });
                            if (scope.hasZeroState()) {
                                //Page loaded if we are showing zero state msg
                                $rootScope.pageLoaded();
                            }
                        }
                    };

                    scope.$watch('currentRoster.students', function(studentsList) {
                        $log.log('studentsList updated', scope.studentsList);
                        scope.studentsList = studentsList;
                        calculateZeroState();
                    }, true);

                    scope.$watch('assignmentData.assignmentsCount', function(newAssignmentsCount) {
                        $log.log('assignmentsCount changed', scope.assignmentsCount);
                        scope.assignmentsCount = newAssignmentsCount;
                        calculateZeroState();
                    }, true);

                    scope.viewHiddenAssignments = function() {
                        scope.$emit('assignment:zeroState:viewHidden');
                    };

                    scope.redirectToGoogleClassroom = function() {
                        googleClassroomService.redirectToGoogleClass(scope.currentRoster.classId,
                            scope.currentRoster.rosterSource);
                    };

                    scope.isRealizeClass = function() {
                        return !scope.currentRoster.isGoogleClass();
                    };

                    scope.isGoogleClass = function() {
                        return scope.currentRoster.isGoogleClass() &&
                            !(scope.currentUser.getAttribute('isAutoRostered') &&
                            scope.currentUser.getAttribute('isClassLinkingEnabled'));
                    };

                    scope.isAutoPlusOrgGoogleClass = function() {
                        return scope.currentRoster.isGoogleClass() &&
                            scope.currentUser.getAttribute('isAutoRostered') &&
                            scope.currentUser.getAttribute('isClassLinkingEnabled');
                    };
                }
            };
        }
    ]);
