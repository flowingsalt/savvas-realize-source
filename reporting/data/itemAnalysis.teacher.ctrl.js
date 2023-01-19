angular.module('Realize.reporting.data.ItemAnalysisCtrl', [
        'ModalServices'
    ])
    .controller('ItemAnalysisCtrl', [
        '$scope',
        '$routeParams',
        'ReportData',
        'Modal',
        '$window',
        function($scope, $routeParams, ReportData, Modal, $window) {
            'use strict';

            $scope.scoresMap = [];

            $scope.scoresMap = ReportData;
            if ($window.itemAnalysisV2Enabled || $routeParams.itemAnalysisV2) {
                $scope.isV2Enabled = true;
            } else if ($scope.scoresMap.isPAF) {
                $scope.analysisTemplate = 'templates/partials/paf_item_analysis.html';
            } else {
                $scope.analysisTemplate = 'templates/partials/nativeItemAnalysis.html';
            }

            $scope.openDialog = function(question, response, event) {
                event.stopPropagation();
                event.preventDefault();
                if (response.count !== 0) {
                    var modalScope = $scope.$new(true);
                    modalScope.question = question;
                    modalScope.response = response;
                    modalScope.close = Modal.hideDialog;

                    Modal.showDialog('templates/partials/studentInfoDialog.html', modalScope);
                }
            };

            $scope.back = function() {
                $scope.goBack([
                    '/data/', $routeParams.classId, '/overview/assignment/',
                    $routeParams.assignmentId, '/recap/', $routeParams.assessmentId
                ].join(''));
            };

            //Non-native
            $scope.showStudentsDialog = function(status, students, event) {
                event.stopPropagation();
                event.preventDefault();
                if (students.length > 0) {
                    var modalScope = $scope.$new(true);
                    modalScope.status = status;
                    modalScope.students = students;
                    modalScope.close = Modal.hideDialog;

                    Modal.showDialog('templates/partials/student_paf_analysis_dialog.html', modalScope);
                }
            };

            $scope.showCorrectStudents = function(question, event) {
                $scope.showStudentsDialog('correct', question.studentsCorrect, event);
            };

            $scope.showIncorrectStudents = function(question, event) {
                $scope.showStudentsDialog('incorrect', question.studentsIncorrect, event);
            };

            $scope.showPartialStudents = function(question, event) {
                $scope.showStudentsDialog('partial', question.studentsPartial, event);
            };
        }
    ]);
