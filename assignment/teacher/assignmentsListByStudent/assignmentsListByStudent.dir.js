angular.module('Realize.assignment.listByStudent', [
    'Realize.analytics',
    'Realize.assignment.assignmentsListByStudentService',
    'Realize.assignment.facadeService',
    'Realize.common.mediaQueryService',
    'rlzComponents.components.googleClassroom.constants',
    'rlzComponents.components.needsToConnect',
    'components.realize.user',
    'rlzComponents.assignmentTelemetryModule',
    'rlzComponents.routedComponents.assignments.constants',
])
    .directive('assignmentsListByStudent', [
        '$log',
        '$rootScope',
        '$routeParams',
        'AssignmentFacadeService',
        'ASSIGNMENT_CONSTANTS',
        '$location',
        'AssignmentListByStudentService',
        'MediaQuery',
        'lwcI18nFilter',
        'currentUser',
        'assignmentTelemetryService',
        'ASSIGNMENT_TELEMETRY_CONSTANTS',
        'GOOGLE_CLASSROOM',
        'needsToConnectService',
        function($log, $rootScope, $routeParams, AssignmentFacadeService, ASSIGNMENT_CONSTANTS,
            $location, AssignmentListByStudentService, MediaQuery, lwcI18nFilter, currentUser,
            assignmentTelemetryService, ASSIGNMENT_TELEMETRY_CONSTANTS, GOOGLE_CLASSROOM,
            needsToConnectService) {
            'use strict';

            return {
                scope: {
                    classRosterData: '='
                },
                templateUrl: 'templates/assignment/teacher/assignmentsListByStudent/assignmentsListByStudent.html',

                link: function(scope) {

                    scope.componentLoading = true;
                    scope.useShortLables = !MediaQuery.breakpoint.isDesktop;

                    scope.$on('window.breakpoint.change', function bpChanged() {
                        scope.useShortLables = !MediaQuery.breakpoint.isDesktop;
                    });

                    AssignmentFacadeService.getAssignmentsByStudent($routeParams.classId).then(function(result) {

                        var defaultTab = $rootScope.currentUser.isStudent ? ASSIGNMENT_CONSTANTS.STATUS.NOT_STARTED :
                            ASSIGNMENT_CONSTANTS.STATUS.COMPLETED;
                        scope.activeTab = $routeParams.status || defaultTab;

                        scope.studentsList = scope.classRosterData.students;

                        scope.studentResultList = [];

                        _.each(result, function(student, studentId) {
                            var names = _.find(scope.studentsList, function(studentUser) {
                                return studentId === studentUser.userId;
                            });

                            if (names) {
                                student.name = names.lastFirst;
                                student.avatarUrl = names.avatarUrl;
                                student.googleConsentProvided = names.userAttributes.googleConsentProvided;
                                student.assignmentsCompleted = student.totalAssignmentsCount -
                                    student.incompleteAssignmentsCount;
                            }
                            scope.studentResultList.push(student);
                        });

                        scope.getStudentConsent = function(student) {
                            return student.googleConsentProvided;
                        };

                        scope.preventClickPropagation = function(event, student) {
                            if (!scope.getStudentConsent(student)) {
                                event.stopPropagation();
                                needsToConnectService.closeAll(event);
                            }
                        };

                        scope.isGoogleClass = function() {
                            return (scope.classRosterData.rosterSource ===
                                GOOGLE_CLASSROOM.ROSTER_SOURCE.GOOGLE_CLASSROOM ||
                                scope.classRosterData.googleLinkedClass);
                        };

                        scope.isGoogleLinkedClass = function() {
                            return scope.classRosterData.googleLinkedClass;
                        };

                        var HEADER_NAME_CONSTANTS  = {
                            NAME: 'name',
                            STATUS: 'assignmentStatus',
                            AVERAGE: 'studentAverageScore'
                        };
                        scope.assignmentCompleted = function(student) {
                            return student.totalAssignmentsCount > 0 &&
                                student.totalAssignmentsCount === student.assignmentsCompleted;
                        };

                        scope.assignmentNotCompleted = function(student) {
                            return student.totalAssignmentsCount > 0 &&
                                student.totalAssignmentsCount !== student.assignmentsCompleted;
                        };

                        scope.assignmentNotScored = function(student) {
                            return student.totalAssignmentsCount === 0;
                        };

                        scope.showNotScored = function(student) {
                            return student.totalAssignmentsCount > 0 &&
                                student.notScoredAssignmentsCount > 0 &&
                                student.notSentAssignmentsCount === 0;
                        };

                        scope.showNotSent = function(student) {
                            return student.totalAssignmentsCount > 0 &&
                                student.notSentAssignmentsCount > 0;
                        };

                        scope.showAverage = function(student) {
                            return student.totalAssignmentsCount > 0 &&
                                student.notScoredAssignmentsCount === 0 &&
                                student.notSentAssignmentsCount === 0 &&
                                student.studentAverageScore && student.studentAverageScore.isValid;
                        };

                        scope.showDash = function(student) {
                            return student.totalAssignmentsCount === 0 ||
                                (student.notSentAssignmentsCount === 0 && student.notScoredAssignmentsCount === 0 &&
                                    (!student.studentAverageScore || !student.studentAverageScore.isValid));

                        };

                        scope.componentLoading = false;
                        $rootScope.pageLoaded();
                        scope.openStudentStatus = function(e, student) {
                            e.preventDefault();
                            e.stopPropagation();

                            var statusUrl = '/classes/' + scope.classRosterData.classId + '/student/' +
                                student.id + '/assignments';
                            $location.path(statusUrl).search({
                                activeTab: $routeParams.activeTab
                            });
                        };

                        scope.openStudentCompleteStatus = function(e, student) {
                            e.preventDefault();
                            e.stopPropagation();

                            var statusUrl = '/classes/' + scope.classRosterData.classId +
                                '/student/' + student.id + '/assignments';
                            $location.path(statusUrl).search({
                                status: ASSIGNMENT_CONSTANTS.STATUS.COMPLETED,
                                activeTab: $routeParams.activeTab
                            });
                        };

                        function getIncompleteAssignmentsCount(student) {
                            // -1 negate the incomplete count, so that smaller counts are sorted higher in number
                            return (student.totalAssignmentsCount > 0) ?
                                   (student.incompleteAssignmentsCount * -1) : null;
                        }
                        var getSortPreferences = function(attr) {
                            var sortOptions = { sortField : 'name', isReverseOrdered : false };
                            if (angular.isDefined(attr) && angular.isDefined(attr.sortOrder) &&
                                angular.isDefined(attr.sortField)) {
                                return angular.extend({}, sortOptions, {
                                    sortField : attr.sortField,
                                    isReverseOrdered : attr.sortOrder === 'DESC',
                                });
                            }
                            return sortOptions;
                        };
                        var sortByScore = AssignmentListByStudentService.getSortByScore();
                        var userAttributes = currentUser.getAttribute(ASSIGNMENT_CONSTANTS.
                            SORT_ASSIGNMENT_STUDENT_KEY);
                        var sortPreferences = getSortPreferences(userAttributes);
                        scope.sortingOrder = sortPreferences.sortField;
                        if (sortPreferences.sortField === 'name') {
                            scope.sortAssignmentByStudent = 'name';
                        } else if (sortPreferences.sortField === 'assignmentStatus') {
                            scope.sortAssignmentByStudent = [getIncompleteAssignmentsCount, 'name'];
                        } else if (sortPreferences.sortField === 'studentAverageScore') {
                            scope.sortAssignmentByStudent = sortByScore;
                        }
                        scope.reverse = sortPreferences.isReverseOrdered;
                        scope.sortBy = function(newSortingOrder) {
                            if (scope.sortingOrder === newSortingOrder) {
                                scope.reverse = !scope.reverse;
                            } else {
                                if (newSortingOrder === 'name') {
                                    scope.sortAssignmentByStudent = 'name';
                                } else if (newSortingOrder === 'assignmentStatus') {
                                    scope.sortAssignmentByStudent = [getIncompleteAssignmentsCount, 'name'];
                                } else if (newSortingOrder === 'studentAverageScore') {
                                    scope.sortAssignmentByStudent = sortByScore;
                                }

                                scope.reverse = false;
                                scope.sortingOrder = newSortingOrder;
                            }
                            var newSortType = scope.reverse ? ASSIGNMENT_CONSTANTS.DESC :
                                ASSIGNMENT_CONSTANTS.ASC;
                            currentUser.setAttribute(ASSIGNMENT_CONSTANTS.SORT_ASSIGNMENT_STUDENT_KEY, {
                                sortField: newSortingOrder,
                                sortOrder: newSortType }, true);
                            sendTelemetryEvent();
                        };

                        var sendTelemetryEvent = function()  {
                            var sortOrder = scope.reverse ? ASSIGNMENT_TELEMETRY_CONSTANTS.
                                DESCRIPTION.DESC : ASSIGNMENT_TELEMETRY_CONSTANTS.DESCRIPTION.ASC;
                            assignmentTelemetryService.sendAssignmentSortTelemetryEvent(
                                getLabelValueForTelemetry(scope.sortingOrder),
                                sortOrder, ASSIGNMENT_TELEMETRY_CONSTANTS.PAGE.ASSIGNMENTS_BY_STUDENT);
                        };

                        var getLabelValueForTelemetry = function(fieldName) {
                            if (fieldName === HEADER_NAME_CONSTANTS.NAME) {
                                return lwcI18nFilter('assignmentList.columnHeader.studentName');
                            } else if (fieldName === HEADER_NAME_CONSTANTS.STATUS) {
                                return lwcI18nFilter('assignmentList.columnHeader.assignmentStatus');
                            } else if (fieldName === HEADER_NAME_CONSTANTS.AVERAGE) {
                                return lwcI18nFilter('assignmentList.columnHeader.average.label');
                            } else {
                                return ASSIGNMENT_TELEMETRY_CONSTANTS.EMPTY_STRING;
                            }
                        };

                        scope.isSortingBy = function(option) {
                            var selectors = ['sortBy'];
                            if (scope.sortingOrder === option) {
                                selectors.push(scope.reverse ? 'icon-sort-up' : 'icon-sort-down');
                            } else {
                                selectors.push('icon-sort');
                            }
                            return selectors;
                        };

                        scope.getSortAriaLabel = function(type) {
                            var outputArray = [];
                            switch (type) {
                                case 'name':
                                    outputArray.push(lwcI18nFilter('assignmentList.columnHeader.studentName'));
                                    break;
                                case 'assignmentStatus':
                                    outputArray.push(scope.useShortLabels ?
                                        lwcI18nFilter('assignmentList.columnHeaderShort.assignmentStatus') :
                                        lwcI18nFilter('assignmentList.columnHeader.assignmentStatus'));
                                    break;
                                case 'studentAverageScore':
                                    outputArray.push(lwcI18nFilter('assignmentList.columnHeader.average.label'));
                                    break;
                                default:
                                    console.warn('unexpected sort type received. Ignoring.');
                                    break;
                            }
                            outputArray.push(lwcI18nFilter('teacherItemAnalysis.sorting.sortableColumn'));
                            if (scope.sortingOrder === type) {
                                outputArray.push(scope.reverse ?
                                    lwcI18nFilter('masteryByStandard.sorting.sortedDescending') :
                                    lwcI18nFilter('masteryByStandard.sorting.sortedAscending'));
                            }
                            return outputArray.join(', ');
                        };
                    });
                }
            };
        }
    ]);
