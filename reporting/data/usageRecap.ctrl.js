angular.module('Realize.reporting.data.UsageRecapCtrl', [
        'Realize.reporting.data.TrackingService',
        'Realize.reporting.ReportService',
        'Realize.reporting.friendlyTime',
        'Realize.reporting.friendlyTimeFilter',
        'RealizeDataServices'
    ])
    .controller('UsageRecapCtrl', [
        '$scope',
        '$log',
        '$routeParams',
        '$location',
        '$rootScope',
        'RealizeHelpers',
        'ReportService',
        'TeacherAssignmentData',
        'ClassRosterData',
        'GroupData',
        'AssignmentUtil',
        'breadcrumbTelemetryService',
        'BREADCRUMB_TELEMETRY_CONSTANTS',
        'locationUtilService',
        'penpalService',
        '$timeout',
        '$window',
        'featureManagementService',
        function($scope, $log, $routeParams, $location, $rootScope, RealizeHelpers,
            ReportService, TeacherAssignmentData, ClassRosterData, GroupData, AssignmentUtil,
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

            var switchAssignment = function(index) {

                $scope.assignment = $scope.assignments[index];
                $scope.assignmentIndex = index;

                var leftPartPath = $location.path().split('/assignment')[0],
                    path = [
                        leftPartPath,
                        'assignment',
                        $scope.assignment.assignmentId,
                        'usage/recap',
                        $routeParams.filterStartDate,
                        $routeParams.filterEndDate,
                        $scope.assignmentIndex
                    ].join('/'),
                    search = $location.search();

                search = (_.isEmpty(search)) ? null : search;

                $location.path(RealizeHelpers.buildUrl(path), search);
            };

            $scope.prevAssignment = function() {
                switchAssignment(Number($scope.assignmentIndex) - 1);
            };

            $scope.nextAssignment = function() {
                switchAssignment(Number($scope.assignmentIndex) + 1);
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
            $scope.programHierarchy = getProgramHierarchy($scope.selectedAssignment);
            $scope.assigneeCommaSeparatedList = $scope.selectedAssignment.assigneeList.join(' | ');

            var getValidDateFromString = function(string) {
                if (!string) {
                    return null;
                }

                var d = new Date(string);
                if (angular.isDate(d)) {
                    return d;
                }

                d = Date.parse(string);
                if (angular.isDate(d)) {
                    return d;
                }

                return null;
            };

            var getStudentsList = function() {
                ReportService.getStudentUsage($routeParams.classId, $routeParams.assignmentId).then(
                    function(response) {

                        var data = response.data;

                        data.assignmentDueDate = getValidDateFromString(data.assignmentDueDate);

                        $scope.usageData = data;

                        $scope.usageData.classUuids = [];
                        $scope.usageData.groupUuids = [];
                        $scope.usageData.studentUuids = [];

                        $scope.assignments = ReportService.usageReportList;
                        $scope.assignmentIndex = $routeParams.assignmentIndex;
                        $scope.assignment = $scope.assignments[$scope.assignmentIndex];

                        // if we can't find assignment, go back
                        if (!$scope.assignments) {
                            return $scope.back($scope.locationFallback);
                        }
                    }
                ).finally(function() {
                    $scope.pageLoaded();
                });
            };

            if (!ReportService.usageReportList.length) {
                // Use the $routeParams for the date.  (should I fallback to using range from today to 30 days future?
                // ever happen?)
                // in the dates, replace the dashes - with slashes /.
                var startDate, endDate;

                if ($routeParams.filterStartDate && $routeParams.filterEndDate) {
                    startDate = $routeParams.filterStartDate.replace(/-/g, '/');
                    endDate = $routeParams.filterEndDate.replace(/-/g, '/');
                } else {
                    // not sure this could/should ever happen?  no routeParams?
                    // i guess wouldn't if removed from appRoutesTeacher.js
                    startDate = Date.today().addMonths(-1).toString('MM/dd/yyyy');
                    endDate = Date.today().addMonths(1).toString('MM/dd/yyyy');
                }

                ReportService.getUsageReport($routeParams.classId, startDate, endDate).then(function() {
                    getStudentsList();
                });
            } else {
                getStudentsList();
            }

            $scope.breadcrumbHandler = function($event, url) {
                $event.stopPropagation();
                var breadcrumbItem = $event.currentTarget.text;
                var extensionKeys = {
                    page: BREADCRUMB_TELEMETRY_CONSTANTS.PAGE.CLASS_RESULTS_BY_ASSIGNMENT,
                    subpage: BREADCRUMB_TELEMETRY_CONSTANTS.SUBPAGE.USAGE,
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

            $log.log('progress control scope', $scope);

        }
    ]);
