angular.module('Realize.assignment.teacher.manualScoreReviewCtrl', [
    'Realize.analytics',
    'Realize.common.alerts',
    'webStorageModule',
])
.controller('AssignmentManualScoreReviewCtrl', [
    '$scope',
    '$rootScope',
    '$location',
    'AssignmentFacadeService',
    'ClassAndAssignmentData',
    '$routeParams',
    'GroupData',
    '$log',
    'AlertService',
    'InlineAlertService',
    'TEMPLATE_PATH',
    'Modal',
    'lwcI18nFilter',
    'webStorage',
    'urlUtilService',
    'NavigationService',
    function($scope, $rootScope, $location, AssignmentFacadeService, ClassAndAssignmentData, $routeParams, GroupData,
        $log, AlertService, InlineAlertService, templatePath, Modal, lwcI18nFilter,
        webStorage, urlUtilService, NavigationService) {
        'use strict';

        $scope.singleAssessmentTemplate = 'templates/assignment/teacher/manual_score_review_single.html';
        $scope.multipleAssessmentTemplate = 'templates/assignment/teacher/manual_score_review_multiple.html';

        $scope.currentRoster = ClassAndAssignmentData.roster;
        $scope.assignment = ClassAndAssignmentData.assignment;
        $scope.scoringReviewStatus = {};

        //Get Assignees info
        var assigneeList = $scope.assignment.$getAssigneesName($scope.currentRoster, GroupData),
            assigneeArray = [].concat(assigneeList.classes, assigneeList.groups, assigneeList.students);
        $scope.assigneeCSV = assigneeArray.join(' | ');

        //Get list of completed students
        if ($scope.assignment.$isLesson()) {
            if (_.size(ClassAndAssignmentData.completedStudentMetadata) === 1) {
                $scope.singleAssessment = true;
                //Grab the only list
                $scope.completedStudentList = _.values(ClassAndAssignmentData.completedStudentsByContent)[0];
            } else {
                $scope.singleAssessment = false;
                $scope.completedStudentsByContent = ClassAndAssignmentData.completedStudentsByContent;
                var completedContentIds = _.keys($scope.completedStudentsByContent);
                $scope.contentItems = $scope.assignment.$getLessonItemsCompletedByStudent(completedContentIds);
            }
        } else {
            $scope.singleAssessment = true;
            $scope.completedStudentList = ClassAndAssignmentData.completedStudentList;
        }

        if ($scope.singleAssessment) {
            $scope.scoringReviewStatus = AssignmentFacadeService.getScoreStatusCounts($scope.completedStudentList);
        } else {
            var flattenedMetadataList = _.flatten(_.values($scope.completedStudentsByContent), true);
            $scope.scoringReviewStatus = AssignmentFacadeService.getScoreStatusCounts(flattenedMetadataList);
        }

        //Navigation
        $scope.sentScoreSuccess = function() { //Alert and redirect to assignments list
            var successSendScoreAlertMsg = '<strong>' +
                lwcI18nFilter('assignmentList.sentScore.successNotification.message') + '</strong> ',
                currentTab = $location.search().activeTab;

            if (currentTab === 'assignmentsByStudent') {
                AlertService.addAlert('success', 'ok-sign', successSendScoreAlertMsg, 3);
            } else {
                InlineAlertService.addAlert(
                    $scope.assignment.assignmentId, {type: 'success', msg: successSendScoreAlertMsg}
                );
            }
            var backUrl = $location.search().backUrl;
            if (!!backUrl) {
                var userAssignmentId = webStorage.get('lastUpdatedUserAssignmentId');
                var url = urlUtilService.replacePathVariable(backUrl, 'userAssignments', userAssignmentId);
                NavigationService.navigate(url);
            } else {
                $location.path('/classes/' + $routeParams.classId + '/assignments/');
            }
        };

        $scope.openStudentManualScore = function(student, contentItem) {
            var next = [
                '/classes', $routeParams.classId, 'assignments', $scope.assignment.assignmentId,
                'manualScore', 'content', contentItem.id, contentItem.version,
                'student', student.studentUuid, 'userAssignmentId', student.userAssignmentId
            ].join('/');
            $location.path(next);
        };

        $scope.back = function() {
            $scope.goBack();
        };

        //Publish score to student
        var publishAssignmentScores = function() {
            AssignmentFacadeService.publishScores($scope.assignment.assignmentId, $scope.currentRoster.classId)
                .then(function() {
                    $log.log('Publish Assignment Scores: SUCCESS');
                    $scope.loading = false;
                    $scope.sentScoreSuccess();
                });
        };

        /* Possible outcomes on sent button
         * 1. Partially not scored, all not sent, send scored only
         * 2. All scored, partially not sent, send remaining
         * 3. Partially scored, partially not sent, send scored that are not sent
         * 4. (no modal) Happy path, all scored and now sending all
        */
        $scope.sendScore = function(e) {
            e.preventDefault();
            e.stopPropagation();

            $scope.loading = true;

            var isPartiallyScored = $scope.scoringReviewStatus.isPartiallyScored,
                isPartiallySent =  $scope.scoringReviewStatus.isPartiallySent,
                closeModal = function() {
                    Modal.hideDialog();
                    $scope.loading = false;
                },
                confirm = function() {
                    publishAssignmentScores();
                };

            if (isPartiallyScored || isPartiallySent) {

                var title = lwcI18nFilter('reviewManualScore.sendScoreModal.title'),
                    body, sendButtonMsg;

                if (isPartiallyScored && !isPartiallySent) {
                    body = lwcI18nFilter('reviewManualScore.sendScoreModal.message.notAllScored');
                    sendButtonMsg = lwcI18nFilter('reviewManualScore.sendScoreModal.action.sendScoreSubmissions');

                } else if (isPartiallySent && !isPartiallyScored) {
                    body = lwcI18nFilter('reviewManualScore.sendScoreModal.message.partiallySent');
                    sendButtonMsg = lwcI18nFilter('reviewManualScore.sendScoreModal.action.sendScoreRemaining');

                } else if (isPartiallyScored && isPartiallySent) {
                    body = lwcI18nFilter('reviewManualScore.sendScoreModal.message.notAllScoredAndPartiallySent');
                    sendButtonMsg = lwcI18nFilter('reviewManualScore.sendScoreModal.action.sendScoreRemaining');

                }
                var options = {
                        id: 'sendScoreReviewWarningModal'
                    };
                var buttons = {
                        OK : {
                            title: sendButtonMsg,
                            handler: confirm,
                            isDefault: true
                        },
                        CANCEL : {
                            title: lwcI18nFilter('reviewManualScore.sendScoreModal.action.cancelBtn'),
                            handler: closeModal
                        }
                    };

                Modal.simpleDialog(title, body, buttons,  options);

            } else {
                publishAssignmentScores();
            }
        };

        $scope.$on('$destroy', function() {
            if (!_.isEmpty(webStorage.get('lastUpdatedUserAssignmentId'))) {
                webStorage.remove('lastUpdatedUserAssignmentId');
            }
        });

    }]);
