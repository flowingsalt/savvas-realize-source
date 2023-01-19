angular.module('Realize.reporting.grades.StudentProgressRecapCtrl', [
        'Realize.analytics',
        'Realize.reporting.ReportService',
        'rlzComponents.components.featureManagement',
        'rlzComponents.components.assignment.services'
    ])
    .controller('StudentProgressRecapCtrl', [
        '$scope',
        '$routeParams',
        '$location',
        'ProgressRecap',
        'ReportService',
        'Analytics',
        'featureManagementService',
        'assignmentScoreHelperService',
        function($scope, $routeParams, $location, ProgressRecap, ReportService, Analytics, featureManagementService,
            assignmentScoreHelperService) {
            'use strict';

            var statusList = [
                'assignmentsCompletedOnTime',
                'assignmentsCompletedPastDue',
                'assignmentsInProgress',
                'assignmentsNotStarted'
            ];

            $scope.testProgram = function(assignment) {
                var expected = $scope.currentProgram,
                    actual = assignment.programs;

                if (!expected) { return true; }
                if (expected === 'NO_PROGRAM' && (!actual || actual.length === 0)) { return true; }

                return actual.length === 1 && actual[0] === expected;
            };

            $scope.back = function() {
                var basePath = $location.path().split('/overview')[0],
                    next = [basePath, 'overview'].join('/');

                $scope.goBack(next, true);
            };

            if (!ProgressRecap.filters || !ProgressRecap.counts) {
                $scope.back();
            } else {
                $scope.assignments = ProgressRecap.assignments;
                $scope.counts = ProgressRecap.counts;

                $scope.statusList = _.filter(statusList, function(status) {
                    return $scope.counts[status] > 0;
                });

                $scope.currentStatus = $routeParams.status;

                $scope.selectStatus = function(status) {
                    var leftPartPath,
                        path,
                        prettyStatus = {
                            assignmentsCompletedOnTime:   'Completed On Time',
                            assignmentsCompletedPastDue:  'Completed Past Due',
                            assignmentsInProgress:        'In Progress',
                            assignmentsNotStarted:        'Not Started'
                        };

                    Analytics.track(
                        'track.action',
                        {category: 'Grades', action: 'Progress Status dropdown', label: prettyStatus[status]}
                    );

                    leftPartPath = $location.path().split('/status')[0];
                    path = [
                        leftPartPath, 'status', status, $routeParams.filterStartDate, $routeParams.filterEndDate
                    ].join('/');
                    $location.path(path);
                };
            }

            $scope.currentProgram = ReportService.currentProgram;

            $scope.isAssignmentNeedManualScore = function(assignment) {
                return (assignment.hasNotSentManualScore || assignment.hasNotScoredManualScore) &&
                    !assignment.isAdaptiveAssignment();
            };

            $scope.isAssignmentScored = function(assignment) {
                return !$scope.isAssignmentNeedManualScore(assignment) &&
                    assignment.averageScore !== null && !assignment.isAdaptiveAssignment() &&
                    !assignment.isMultiStageAssignment();
            };

            $scope.isAssignmentNoScore = function(assignment) {
                return (assignment.isAdaptiveAssignment() && !assignment.$isCompleted()) ||
                      (!$scope.isAssignmentNeedManualScore(assignment) &&
                    assignment.averageScore === null && !assignment.isAdaptiveAssignment()) ||
                    (assignment.isMultiStageAssignment());
            };

            $scope.showStars = function(assignment) {
                return assignment.isAdaptiveAssignment() && assignment.$isCompleted() &&
                    !featureManagementService.isKnewtonRecommendationDisabled();
            };

            $scope.showFraction = function(assignment) {
                return assignment.isAdaptiveAssignment() && assignment.$isCompleted() &&
                    featureManagementService.isKnewtonRecommendationDisabled();
            };

            $scope.showAdaptiveScore = function(assignment) {
                var metadata = assignment.studentMetadata[0];
                var contentItem = assignment.contentItem;
                var info = assignmentScoreHelperService.getScoreInfo(assignment, contentItem, metadata);
                return info.scoreDisplayText;
            };

            $scope.getSubmitDate = function(assignment) {
                return assignment.isSingleDiscussion() ?
                assignment.$getLegibleDateObj().dueDate : assignment.$getPrimaryMetadata().lastOpenDate;
            };
        }
    ]);
