angular.module('Realize.reporting.grades.StudentItemAnalysisCtrl', [
        'Realize.reporting.grades.StudentItemAnalysisSvc'
    ])
    .controller('StudentItemAnalysisCtrl', [
        '$log',
        '$scope',
        '$routeParams',
        '$location',
        'ItemAnalysis',
        'Summary',
        'RosterData',
        'UserAssignmentData',
        'StudentItemAnalysisSvc',
        'featureManagementService',
        function($log, $scope, $routeParams, $location, ItemAnalysis, Summary,
            RosterData, UserAssignmentData, StudentItemAnalysisSvc, featureManagementService) {
            'use strict';

            var currentIdx;

            // setup...
            $scope.itemAnalysis = ItemAnalysis;
            $scope.summary = Summary;
            $scope.scoreSent = !!UserAssignmentData.scoreSent;
            $scope.currentRoster = RosterData; //used by classes list dropdown
            $scope.sessionId = $routeParams.sessionId;
            $scope.navigationFallback = $location.path().split('/assignment')[0];

            $scope.isAssessmentViewerEnabled = featureManagementService.isAssessmentViewerEnabled();

            if (!$scope.itemAnalysis.assessments || $scope.itemAnalysis.assessments.length === 0) {
                $log.error('No assessments found', $scope.itemAnalysis);
                $scope.goBack($scope.navigationFallback);
            }

            // figure out current position for next-prev buttons...
            currentIdx = 0;
            angular.forEach($scope.itemAnalysis.assessments, function(assessment) {
                if (assessment.assessmentSessionId === $routeParams.sessionId) {
                    $scope.assessmentIndex = currentIdx;
                }

                currentIdx++;
            });

            $scope.score = StudentItemAnalysisSvc.calculateScore($scope.itemAnalysis.current.score);
            // assetTitle field has the updated assessment title after customizing an assessment in builder
            $scope.assessmentTitle = $scope.itemAnalysis.current.assessment.assetTitle;
            $scope.isPAF = StudentItemAnalysisSvc.isPaf($scope.itemAnalysis);
            $scope.questionData = StudentItemAnalysisSvc.getFormattedQuestionData($scope.itemAnalysis);

            // event handlers...
            $scope.prevAssessment = function() {
                var prev = Math.max(0, $scope.assessmentIndex - 1);
                StudentItemAnalysisSvc.switchAssessment($scope.itemAnalysis, prev);
            };

            $scope.nextAssessment = function() {
                var next = Math.min($scope.itemAnalysis.assessments.length, $scope.assessmentIndex + 1);
                StudentItemAnalysisSvc.switchAssessment($scope.itemAnalysis, next);
            };

            $scope.back = function() {
                var pathArray = $location.path().split('/assignment'),
                    next;

                pathArray.pop();
                next = pathArray.join('/assignment');

                $scope.goBack(next, true);
            };
        }
    ]);
