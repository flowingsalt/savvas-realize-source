// progress.js

angular.module('Realize.reporting.data.ProgressCtrl', [
        'RealizeDataServices',
        'Realize.reporting.ReportService',
        'Realize.common.popOverUtils',
        'Realize.common.popOverComponent'
    ])
    .controller('ProgressCtrl', [
        '$scope',
        '$routeParams',
        'TeacherAssignmentData',
        'ClassRosterData',
        'GroupData',
        '$location',
        '$rootScope',
        '$log',
        '$filter',
        'ReportService',
        'AssignmentFacadeService',
        'PopOverUtilService',
        'AssignmentUtil',
        'breadcrumbTelemetryService',
        'BREADCRUMB_TELEMETRY_CONSTANTS',
        'locationUtilService',
        'penpalService',
        '$timeout',
        '$window',
        'featureManagementService',
        function($scope, $routeParams, TeacherAssignmentData, ClassRosterData, GroupData, $location, $rootScope,
            $log, $filter, ReportService, AssignmentFacadeService, PopOverUtilService, AssignmentUtil,
            breadcrumbTelemetryService, BREADCRUMB_TELEMETRY_CONSTANTS, locationUtilService, penpalService,
            $timeout, $window, featureManagementService) {

            'use strict';

            $scope.back = function() {
                if (locationUtilService.isDeeplinkDataTabActive()) {
                    $location.path(['/deeplink/data/', $routeParams.classId, '/overview'].join(''));
                }else {
                    $location.path(['/data/', $routeParams.classId, '/overview'].join(''));
                }
            };
            if (locationUtilService.isDeeplinkDataTabActive()) {
                $rootScope.hideFooter = true;
            }
            $scope.$on('$viewContentLoaded', function() {
                $timeout(function() {
                    if (locationUtilService.isDeeplinkDataTabActive()) {
                        var body = document.body,
                            html = document.documentElement;
                        var height = Math.max(body.scrollHeight, body.offsetHeight,
                            html.clientHeight, html.scrollHeight, html.offsetHeight);
                        var payload = { resize_height: height };
                        penpalService.connectToParent().then(function(connection) {
                            connection.parent.exec('RESIZE_PAGE', payload);
                        });
                    }
                }, 1000);
            });

            $scope.pageLoading();
            //Shift focus to the first element of the page.
            document.querySelector('#skipNav a').focus();

            var switchAssignment = function() {
                var leftPartPath = $location.path().split('/assignment')[0],
                    path = [
                        leftPartPath, 'assignment', $scope.assignment.assignmentId, 'progress/recap',
                        $routeParams.filterStartDate, $routeParams.filterEndDate, $scope.assignmentIndex
                    ].join('/');
                $location.path(path);
                $log.log('here after location change');
            };

            $scope.prevAssignment = function() {
                $scope.assignmentIndex--;
                $scope.assignment = $scope.assignments[$scope.assignmentIndex];
                switchAssignment();
            };

            $scope.nextAssignment = function() {
                $scope.assignmentIndex++;
                $scope.assignment = $scope.assignments[$scope.assignmentIndex];
                switchAssignment();
            };

            $scope.selectedAssignment = TeacherAssignmentData;
            var assigneesName = $scope.selectedAssignment.$getAssigneesName(ClassRosterData, GroupData);
            $scope.selectedAssignment.assigneeList = [].concat(
                assigneesName.classes,
                assigneesName.groups,
                assigneesName.students
            );
            var getProgramHierarchy = function(assignment) {
                var updateAssignment = AssignmentUtil.getAssignmentWithProgramHierarchy(assignment);
                return updateAssignment.breadcrumb || [];
            };
            $scope.programHierarchy = getProgramHierarchy(TeacherAssignmentData);
            $scope.assigneeCommaSeparatedList = $scope.selectedAssignment.assigneeList.join(' | ');

            var getStudentsList = function() {
                var ELLIPSES_NAME = ReportService.CONSTANTS.RECAP.ELLIPSES_NAME;
                ReportService.getStudentProgress($routeParams.classId, $routeParams.assignmentId).then(
                    function(response) {
                        var dueDate = new Date(response.data.assignmentDueDate);
                        $scope.progressData = response.data;
                        $scope.progressData.assignmentDueDate = dueDate;
                        $scope.beforeDueDateWarningVisible = Date.today().isBefore(dueDate);
                        $scope.progressData.classUuids = [];
                        $scope.progressData.groupUuids = [];
                        $scope.progressData.studentUuids = [];

                        angular.forEach($scope.progressData.studentsProgress, function(student) {
                            student.isComplete = student.viewedStatus === 'completed' && !!student.completedDate;
                            if (student.isComplete) {
                                student.completedDate = new Date(student.completedDate);
                                student.isPastDue = student.completedDate.isAfter(dueDate);
                            } else {
                                var today = new Date();
                                student.isPastDue = today.isAfter(dueDate);
                            }
                            if (student.fullName.length > ELLIPSES_NAME) {
                                student.ellipsesName = $filter('ellipses')(student.fullName, ELLIPSES_NAME);
                            }
                        });

                        angular.forEach($scope.progressData.assignedTo, function(at) {
                            if (at.classUuid && $.inArray(at.classUuid, $scope.progressData.classUuids) < 0 &&
                                !at.groupUuid && !at.studentUuid) {

                                $scope.progressData.classUuids.push(at.classUuid);
                            } else if (at.groupUuid && $.inArray(at.groupUuid, $scope.progressData.groupUuids) < 0) {
                                $scope.progressData.groupUuids.push(at.groupUuid);
                            } else if (at.studentUuid &&
                                $.inArray(at.studentUuid, $scope.progressData.studentUuids) < 0) {

                                $scope.progressData.studentUuids.push(at.studentUuid);
                            }
                        });

                        $scope.assignments = ReportService.progressReportList;
                        $scope.assignmentIndex = $routeParams.assignmentIndex;
                        $scope.assignment = $scope.assignments[$scope.assignmentIndex];

                        // if we can't find assignment, go back
                        if (!$scope.assignments) {
                            return $scope.back($scope.locationFallback);
                        }
                    }).finally(function() {
                        $scope.pageLoaded();
                    });
            };

            $scope.setStudentDataForAdaptive = function(student) {
                var studentMetadata = $scope.selectedAssignment.$getPrimaryMetadata(student.studentId);
                student.userAssignmentDataList = studentMetadata.userAssignmentDataList;
                student.correctTasks = studentMetadata.correctTasks;
                student.totalTasks = studentMetadata.totalTasks;
            };

            $scope.getPopOverContentForScore = function(student) {
                return PopOverUtilService.getPopOverContentForScore(student);
            };

            $scope.isPassed = function(student) {
                return student.userAssignmentDataList[0].score === 5;
            };

            if (!ReportService.progressReportList.length) {
                // Use the $routeParams for the date.
                // (should I fallback to using range from today to 30 days future?  ever happen?)
                // in the dates, replace the dashes - with slashes /.
                var startDate, endDate;

                if ($routeParams.filterStartDate && $routeParams.filterEndDate) {
                    startDate = $routeParams.filterStartDate.replace(/-/g, '/');
                    endDate = $routeParams.filterEndDate.replace(/-/g, '/');
                } else {
                    //TODO remove this?
                    // not sure this could/should ever happen?  no routeParams?
                    // i guess wouldn't if removed from appRoutesTeacher.js
                    startDate = Date.today().addMonths(-1).toString('MM/dd/yyyy');
                    endDate = Date.today().addMonths(1).toString('MM/dd/yyyy');
                }

                ReportService.getProgressReport($routeParams.classId, startDate, endDate).then(function() {
                    getStudentsList();
                });
            } else {
                getStudentsList();
            }

            var isLessonAssignment = $scope.selectedAssignment.$isLesson();

            $scope.displayManualScoreMsg = function(student) {
                if (student.viewedStatus !== 'completed') {
                    return false;
                }

                if (isLessonAssignment) {
                    var completedManualTestList = $scope.selectedAssignment.
                            $getCompletedManualScoreTestsByStudentId(student.studentId);

                    if (completedManualTestList.length === 0) {
                        return false;
                    }

                    _.each(completedManualTestList, function(metadata) {
                        angular.extend(metadata, AssignmentFacadeService.computeScoreStatus(metadata));
                    });

                    if (_.findWhere(completedManualTestList, {isNotScored: true})) {
                        //If any is not scored
                        return 'notScored';
                    } else if (_.findWhere(completedManualTestList, {isScoreSent: false})) {
                        //If all scored but not sent
                        return 'notSent';
                    } else {
                        return false;
                    }
                } else {
                    var contentItem = $scope.selectedAssignment.contentItem,
                        contentId = contentItem.id;
                    if (!contentId || !contentItem.$isTest()) {
                        return false;
                    } else {
                        var metadata = $scope.selectedAssignment.$findItemMetadata(contentId, student.studentId),
                            manualScoreStatus = AssignmentFacadeService.computeScoreStatus(metadata);
                        if (!manualScoreStatus.isManualScore || manualScoreStatus.isScoreSent) {
                            return false;
                        } else if (manualScoreStatus.isNotScored) {
                            return 'notScored';
                        } else if (!manualScoreStatus.isScoreSent) {
                            return 'notSent';
                        }
                    }
                }
            };

            $scope.displayScore = function(student) {
                var studentMetadata = $scope.selectedAssignment.$getPrimaryMetadata(student.studentId),
                    isManualScoreSource = AssignmentFacadeService.hasScoreSourceManual(studentMetadata);
                return !$scope.displayManualScoreMsg(student) && (student.viewedStatus === 'completed' ||
                    isManualScoreSource) && student.score !== null;
            };

            $scope.displayDash = function(student) {
                var studentMetadata = $scope.selectedAssignment.$getPrimaryMetadata(student.studentId),
                    isManualScoreSource = AssignmentFacadeService.hasScoreSourceManual(studentMetadata);
                return (student.viewedStatus !== 'completed' && !isManualScoreSource) ||
                    (!$scope.displayManualScoreMsg(student) && student.score === null);
            };

            $scope.breadcrumbHandler = function($event, url) {
                $event.stopPropagation();
                var breadcrumbItem = $event.currentTarget.text;
                var extensionKeys = {
                    page: BREADCRUMB_TELEMETRY_CONSTANTS.PAGE.CLASS_RESULTS_BY_ASSIGNMENT,
                    subpage: BREADCRUMB_TELEMETRY_CONSTANTS.SUBPAGE.PROGRESS,
                    area: BREADCRUMB_TELEMETRY_CONSTANTS.AREA.DATA,
                };
                breadcrumbTelemetryService.sendTelemetryEvents(breadcrumbItem, $scope.programHierarchy, extensionKeys);
                if (featureManagementService.isShowBrowseTopnavEnabled()) {
                    $window.parent.location.href = $window.location.protocol +
                        '//' + $window.location.hostname + '/dashboard/' + url;
                } else {
                    $window.parent.location.href = $window.location.protocol +
                        '//' + $window.location.hostname + '/community/' + url;
                }
            };
        }
    ]);
