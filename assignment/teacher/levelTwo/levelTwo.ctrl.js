angular.module('Realize.assignment.teacher.levelTwoCtrl', [
        'components.alert',
        'Realize.common.alerts',
        'Realize.content.constants',
        'Realize.assignment.utilService',
        'rlzComponents.routedComponents.assignments',
        'rlzComponents.components.googleClassroom',
        'rlzComponents.components.googleClassroom.constants',
        'Realize.user.currentUser',
        'rlzComponents.assignmentTelemetryModule',
        'rlzComponents.routedComponents.assignments.constants'
    ])
    .controller('TeacherAssignmentLevelTwoCtrl', [
        '$scope',
        '$rootScope',
        '$location',
        'AssignmentUtil',
        'AssignmentFacadeService',
        'ClassAndAssignmentData',
        'GroupData',
        '$log',
        'AlertService',
        'Modal',
        '$filter',
        'Messages',
        'CONTENT_CONSTANTS',
        'UnsavedChangesModal',
        'rubricEventTracking',
        'telemetryUtilitiesService',
        'googleClassroomService',
        '$timeout',
        'GOOGLE_CLASSROOM',
        'Toast',
        'AssignmentErrorData',
        '$currentUser',
        'GoogleClassroomConstants',
        'assignmentTelemetryService',
        'ASSIGNMENT_TELEMETRY_CONSTANTS',
        'featureManagementService',
        'NavigationService',
        function($scope, $rootScope, $location, AssignmentUtil, AssignmentFacadeService, ClassAndAssignmentData,
            GroupData, $log, AlertService, Modal, $filter, Messages, CONTENT_CONSTANTS, UnsavedChangesModal,
            rubricEventTracking, telemetryUtilitiesService, googleClassroomService, $timeout, GOOGLE_CLASSROOM, Toast,
            AssignmentErrorData, $currentUser, GoogleClassroomConstants, assignmentTelemetryService,
            ASSIGNMENT_TELEMETRY_CONSTANTS, featureManagementService, NavigationService) {
            'use strict';

            $scope.isAssessmentMaintenancePageEnabled = featureManagementService.isAssessmentMaintenancePageEnabled();

            if ($scope.isAssessmentMaintenancePageEnabled) {
                return;
            }
            var allStudentsList = [].concat(
                ClassAndAssignmentData.notStartedList,
                ClassAndAssignmentData.inProgressList,
                ClassAndAssignmentData.completedList
            );
            var studentIds = [];
            angular.forEach(allStudentsList, function(student) {
                if (student && student.studentInfo && student.studentInfo.userId) {
                    studentIds.push(student.studentInfo.userId);
                }
            });
            $scope.assignmentErrorData = googleClassroomService.getAssignmentErrorData(AssignmentErrorData,
                $currentUser.userId, studentIds);
            $scope.classAndAssignmentData = ClassAndAssignmentData;
            $scope.currentRoster = ClassAndAssignmentData.roster;
            $scope.assignment = ClassAndAssignmentData.assignment;
            $scope.classId = $scope.currentRoster.classId;
            $scope.assignmentId = $scope.assignment.assignmentId;
            $scope.groupList = GroupData;
            $scope.gradeInput = $location.path().search('/allstudents/gradeInput') > 0;
            $scope.actionLinksTemplate = 'templates/assignment/teacher/levelTwo/levelTwoActionLinks.html';
            var isGoogleClass = $scope.currentRoster.isGoogleClass();
            googleClassroomService.setFailedAssignmentSyncDetails($scope.assignmentErrorData,
                $scope.assignment, isGoogleClass, $scope.currentRoster.classId);
            //get sync status if assignment is synced earlier or get default status
            $scope.syncObject = googleClassroomService.getAssignmentSyncStatus(
                $scope.assignment.assignmentId, $scope.currentRoster.classId);
            if ($scope.syncObject && $scope.syncObject.status === GOOGLE_CLASSROOM.SYNC_SUCCESS ||
                !$scope.syncObject) {
                $scope.syncObject = googleClassroomService.getAssignmentDefaultStatus();
            }

            $scope.showAssignmentDetailsIntegration = function() {
                return featureManagementService.isExternalAssignmentDetailsLevelTwoEnabled();
            };

            var shouldBeDisabled = true;
            $scope.isSaveButtonDisabled = true;

            $scope.$on('$locationChangeStart', function(event) {
                if (!isClickOnSave) {
                    checkUnsavedChanges(null, event);
                }
            });

            $scope.$on('disableOverAllScoreSaveButton', function() {
                shouldBeDisabled = true;
                updateSaveButtonState();
            });

            $scope.$on('enableOverAllScoreSaveButton', function() {
                shouldBeDisabled = false;
                updateSaveButtonState();
            });

            $scope.$on('allStudents.savebutton.status', function(event, isFormDirty) {
                if (isFormDirty) {
                    shouldBeDisabled = false;
                    updateSaveButtonState();
                }
            });

            var updateSaveButtonState = function() {
                var isSaveButtonDisabled = false;
                if (shouldBeDisabled) {
                    isSaveButtonDisabled = true;
                } else {
                    isSaveButtonDisabled = false;
                    var manualScoreForm = angular.element('.manualScore__form').scope();
                    if (manualScoreForm && !manualScoreForm.manualScore__form.$pristine) {
                        isSaveButtonDisabled = true;
                    }
                }
                $timeout(function() {
                    $scope.isSaveButtonDisabled = isSaveButtonDisabled;
                }, 0);
            };

            $scope.getScore = function(student, lessonItem) {
                if (lessonItem) {
                    var equellaItemId = lessonItem.$getEquellaItemId(),
                        metadata = $scope.assignment.$findItemMetadata(equellaItemId, student.studentUuid);
                    if (metadata && metadata.userAssignmentDataList && metadata.userAssignmentDataList.length >
                        0) {
                        var scoreData = metadata.userAssignmentDataList[0];
                        if ($scope.hasEssayScorer) {
                            $scope.essayScoreData = scoreData.correctAnswers / scoreData.totalQuestions * 6;
                            return $filter('number')($scope.essayScoreData, 0) + '/6';
                        } else {
                            return $filter('number')(scoreData.score, 0);
                        }
                    } else if (lessonItem.fileType === 'SCO' ||
                        lessonItem.fileType === CONTENT_CONSTANTS.FILE_TYPE.TIN_CAN_SCO ||
                        lessonItem.fileType === 'TEST') {
                        //show score as 0% if Completed SCO/TEST with no userAssignmentData on item
                        return 0;
                    }
                }
            };

            $scope.isAdaptive = function() {
                return ($scope.assignment.type  === CONTENT_CONSTANTS.MEDIA_TYPE.ADAPTIVE);
            };

            $scope.cancel = $scope.closeGradeInputView = function(event) {
                var next = $location.path().split('/assignments')[0] + '/assignments';
                if (event) {
                    event.preventDefault();
                    event.stopPropagation();
                }

                $location.path(next);
            };

            $scope.back = function(event) {
                if ($location.search().masteryByStandard) {
                    var splitPath = $location.path().split('/');
                    var constructUrl = '/data/' + splitPath[2] + '/standards';
                    $location.search('masteryByStandard', null);
                    $location.path(constructUrl);
                } else {
                    var next = $location.path().split('/assignments')[0] + '/assignments';
                    if (event) {
                        event.preventDefault();
                        event.stopPropagation();
                    }

                    $location.path(next);
                }
            };

            // Preview the item as if the student were viewing it.
            $scope.preview = function() {
                AssignmentFacadeService.preview([$location.path().split('/gradeInput')[0], 'preview'].join('/'));
            };

            $scope.viewReportScreen = function() {
                AssignmentUtil.redirectToReportScreen($scope.assignment);
                assignmentTelemetryService.sendQuickLinkTelemetryEvent($scope.assignment,
                    ASSIGNMENT_TELEMETRY_CONSTANTS.DATA_LINK,
                    ASSIGNMENT_TELEMETRY_CONSTANTS.PAGE.STUDENT_STATUS,
                    ASSIGNMENT_TELEMETRY_CONSTANTS.EMPTY_STRING);
            };

            $scope.viewDiscussion = function(e, contentItem, student) {

                var path = [
                    '/classes',
                    $location.path().split('/')[2],
                    'discussPrompt/assignments',
                    $scope.assignment.assignmentId,
                    'content', contentItem.id
                ].join('/');

                $location.path(path).search({
                    studentId: angular.isDefined(student) && student.studentUuid,
                    discuss: !$scope.assignment.isAssignmentPastDueDate() ? 'active' : null
                });
            };

            $scope.hideAssignment = function() {
                AssignmentFacadeService.hideAssignment($scope.assignment, $scope.currentRoster.classId,
                    isGoogleClass);
            };

            $scope.unhideAssignment = function() {

                AssignmentFacadeService.unhideAssignment($scope.assignment, $scope.currentRoster.classId,
                    isGoogleClass);
            };

            // To get the alert messages details
            $scope.alertDetails = AlertService.alerts[0];
            $scope.alertIsSet = AlertService.alertIsSet();

            $scope.showGradeInputView = function() {
                var path = $location.path();

                if ((path.search('/gradeInput')) !== -1) {
                    return;
                } else {
                    path = path + '/gradeInput';
                    $location.path(path);
                }
            };

            $scope.showDataLink = function() {
                AssignmentUtil.setDataLinkDetails($scope.assignment);
                return $scope.assignment.showDataLink;
            };

            var setAlert = function() {
                var successGradeInputAlertMsg;
                if (isGoogleClass) {
                    successGradeInputAlertMsg = Messages
                        .getMessage('assignmentStatus.successNotification.gradeInput.googleMessage');
                } else {
                    successGradeInputAlertMsg = [
                        '<strong>',
                        Messages.getMessage('assignmentStatus.successNotification.gradeInput.title'),
                        '</strong>',
                        Messages.getMessage('assignmentStatus.successNotification.gradeInput.message')
                    ].join(' ');
                }

                AlertService.addAlert('success', 'ok-sign', successGradeInputAlertMsg, 2);
            };

            $scope.reviewManualScore = function() {
                var next = [$location.path().split('/allstudents')[0], 'manualScoreReview'].join('/');
                $location.path(next);
            };
            /* Save score */
            var isClickOnSave = false;
            var masterForm = {};
            var userAssignment = {
                userAssignmentDataList: []
            };
            var switchView = function(e) {
                setAlert();
                $scope.closeGradeInputView(e);
            };

            var getCurrentForm = function() {
                return angular.element('.gradeInputForm').scope().gradeInputForm;
            };
            var unsavedChangesModal = new UnsavedChangesModal(function(event) {
                var changesModalDialog = true;
                return $scope.save(event, changesModalDialog);
            });
            var hasManualScoreChanges = function() {
                return !angular.equals(masterForm, $scope.gradeInfo);
            };
            var checkFormValid = function() {
                if (!$scope.gradeInputForm) {
                    $scope.gradeInputForm = angular.element('.gradeInputForm').scope().gradeInputForm;
                }
                /* add comment form and score input form both are visible and
                   add comment form is validated with required attribute
                   grade form is validated with pattern attribute
                   adding below check to ignore form required error on grade save. */
                if ($scope.gradeInputForm.$valid) {
                    return true;
                } else {
                    if ($scope.gradeInputForm.$error.required) {
                        return true;
                    } else if ($scope.gradeInputForm.$error.pattern) {
                        return false;
                    }
                }
            };
            var checkUnsavedChanges = function(currentAction, event) {
                var isGoodToGo = !getCurrentForm() || getCurrentForm().$pristine;

                if (!isGoodToGo && hasManualScoreChanges() && !shouldBeDisabled) {
                    unsavedChangesModal.showDialog(event).then(currentAction, function() {
                        $scope.pageLoaded();
                    });
                }
            };
            var addManualScore = function(student, manualScore) {
                userAssignment.userAssignmentDataList.push({
                    userAssignmentId: student.userAssignmentId,
                    score: angular.isDefined(manualScore) ? manualScore : 0,
                    scoreSent: true
                });
                userAssignment.studentUuid = student.studentUuid;
                return userAssignment;
            };
            angular.forEach(allStudentsList, function(student) {
                masterForm[student.userAssignmentId] =
                    $filter('number')($scope.getScore(student, $scope.assignment.contentItem), 0);
            });
            $scope.gradeInfo = angular.copy(masterForm);

            var navigateToAssignmentsListing = function() {
                var next = $location.path();
                if (next.search('/assignments') !== -1) {
                    next = '/classes/' + $scope.classId + '/assignments';
                    setAlert();
                }
                NavigationService.navigate(next);
            };

            var sendMessageToIframe = function() {
                var assignmentId = $scope.assignment.assignmentId;
                $rootScope.$broadcast('allstudents.score.save', assignmentId);
            };

            var deregisterScoreSavedListener = $rootScope.$on('allstudents.scored.saved', function(event) {
                if (event) {
                    event.preventDefault();
                }
                isClickOnSave = true;
                navigateToAssignmentsListing();
            });
            $scope.$on('$destroy', deregisterScoreSavedListener);

            $scope.save = function(error, modalDialog) {
                if (featureManagementService.isExternalAssignmentDetailsEnabled()) {
                    sendMessageToIframe();
                    return;
                }
                isClickOnSave = true;
                if (checkFormValid()) {
                    if (!hasManualScoreChanges()) {
                        switchView(error);
                    } else {
                        angular.forEach(allStudentsList, function(student) {
                            if (masterForm[student.userAssignmentId] !==
                                $scope.gradeInfo[student.userAssignmentId]) {
                                addManualScore(student, $scope.gradeInfo[student.userAssignmentId]);
                                postTelemetryEvent($scope.gradeInfo[student.userAssignmentId]);
                            }
                        });
                        AssignmentFacadeService.saveManuallyEnteredScore(userAssignment)
                            .then(function() {
                                if (!modalDialog) {
                                    switchView(error);
                                }
                            }, function() {
                                userAssignment.userAssignmentDataList = [];
                            });
                    }
                }
            };

            var postTelemetryEvent = function(updatedScore) {
                if ($scope.productName && $scope.assetsCount) {
                    rubricEventTracking.onAssignmentScoreUpdate(updatedScore, $scope.productName,  $scope.assetsCount);
                } else {
                    $scope.assetsCount = $scope.assignment.childContents ? $scope.assignment.childContents.length : 1;
                    $scope.productName = telemetryUtilitiesService.getProgramTitle($scope.assignment.programHierarchy);
                    rubricEventTracking.onAssignmentScoreUpdate(updatedScore, $scope.productName,  $scope.assetsCount);
                }
            };

            $scope.syncWithGoogle = function(syncStatus) {
                if (syncStatus === GOOGLE_CLASSROOM.SYNC_SUCCESS ||
                    syncStatus === GOOGLE_CLASSROOM.SYNC_IN_PROGRESS) {
                    return;
                } else if (syncStatus === GoogleClassroomConstants.TOKEN_REVOKED) {
                    googleClassroomService.redirectToRealizeSyncWebApp($location.absUrl().toString(), '', '');
                } else {
                    var assignmentId = $scope.assignment.assignmentId;
                    var classId = $scope.currentRoster.classId;
                    var page = GOOGLE_CLASSROOM.ASSIGNMENT_DETAIL;
                    googleClassroomService.syncAssignment(assignmentId, classId, page, $scope.assignment)
                        .then(function() {
                            $scope.syncObject = googleClassroomService.getAssignmentSyncStatus(assignmentId, classId);
                        }).catch(function() {
                            Toast.error(AssignmentUtil.showAssignmentSyncGenericExternalError());
                            $scope.syncObject = googleClassroomService.getAssignmentSyncStatus(assignmentId, classId);
                        });
                    $scope.syncObject = googleClassroomService.getAssignmentSyncStatus(assignmentId, classId);
                }
            };
        }
    ]);
