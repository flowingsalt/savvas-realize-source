angular.module('Realize.assessment.assessmentCreateCtrl', [
    'Realize.assessment.assessmentDataService',
    'Realize.assessment.questionsInTestService',
    'Realize.analytics',
    'Realize.content.contentDataService',
    'Realize.content.model.contentItem',
    'components.alert',
    'rlzComponents.components.i18n',
    'rlzComponents.components.myLibrary.myLibraryEventTracking',
    'rlzComponents.components.myLibrary.constants'
])
    .controller('AssessmentCreateCtrl', [
        '$scope',
        '$location',
        'Analytics',
        'Assessment',
        '$log',
        'BankPlayerTargetMap',
        'Content',
        'ContentDataService',
        'ProgramListInfo',
        'QuestionsInTestService',
        'lwcI18nFilter',
        'Toast',
        'myLibraryEventTracking',
        'MY_LIBRARY_CONSTANTS',
        'featureManagementService',
        function($scope, $location, Analytics, Assessment, $log, BankPlayerTargetMap, Content, ContentDataService,
            ProgramListInfo, QuestionsInTestService, lwcI18nFilter, Toast, myLibraryEventTracking,
            MY_LIBRARY_CONSTANTS, featureManagementService) {
            'use strict';

            $scope.isAssessmentMaintenancePageEnabled = featureManagementService.isAssessmentMaintenancePageEnabled();

            if ($scope.isAssessmentMaintenancePageEnabled) {
                return;
            }

            if (BankPlayerTargetMap) {
                $scope.hasNonNativeBank = BankPlayerTargetMap.hasNonNative;
                $scope.hasNativeBank = BankPlayerTargetMap.hasNative;
            }

            var genericErrorMessage = {
                showCloseIcon: true,
                autoClose: false,
                msg: [
                    '<strong>',
                    lwcI18nFilter('assignmentViewer.turnInModal.alertMessages.error.message1'),
                    '</strong> ',
                    lwcI18nFilter('assignmentViewer.turnInModal.alertMessages.error.message2')
                ].join('')
            };

            var isMyLibraryView = $location.path().includes('/myLibrary');
            var isPlayerLoaded = false;
            var isProgramSelected = false;
            $scope.shouldShowProgramSelection = isMyLibraryView && ProgramListInfo.programs;
            $scope.programs = $scope.shouldShowProgramSelection && ProgramListInfo.programs;

            $scope.onProgramSelection = function(programId, programVersion) {
                $scope.currentProgram = {};
                $scope.hasNonNativeBank = undefined;
                $scope.hasNativeBank = undefined;
                // reset radio buttons on program selection
                resetAssessmentSelection();
                isProgramSelected = true;
                isPlayerLoaded = false;
                $scope.isInProgress = true;
                $scope.programId = programId;
                $scope.programVersion = programVersion;

                Content.get({
                    contentId: programId,
                    version: programVersion
                }).then(function(programItem) {
                    $scope.currentProgram = programItem;
                    ContentDataService.getAvailableBankPlayerTargetMap($scope.currentProgram.library)
                        .then(function(availableBankPlayerTargetMap) {
                            isPlayerLoaded = true;
                            $scope.hasNonNativeBank = availableBankPlayerTargetMap.hasNonNative;
                            $scope.hasNativeBank = availableBankPlayerTargetMap.hasNative;
                            $scope.isInProgress = false;
                        }).catch(function() {
                            Toast.close();
                            Toast.error(genericErrorMessage);
                        });
                });
            };

            var resetAssessmentSelection = function() {
                if ($scope.assessment) {
                    $scope.assessment.isMastery = null;
                    $scope.assessment.useBank = null;
                    $scope.assessment.testType = null;
                    $scope.showFormError = false;
                }
            };

            $scope.shouldShowAssessmentMastery = function() {
                return (isMyLibraryView && isPlayerLoaded) || !isMyLibraryView;
            };

            var analyticsForAssessmentCreateCtrl = function(description) {
                Analytics.track('track.action', {
                    category: 'Programs',
                    action: 'Build a test',
                    label: description
                });
            },
            trackNextAnalytics = function() {
                if ($scope.hasNonNativeBank && !$scope.hasNativeBank) { // only non-native
                    analyticsForAssessmentCreateCtrl('From a bank of questions (non-native)');
                    if (!$scope.assessment.useBank) {
                        analyticsForAssessmentCreateCtrl('Write my own questions');
                    }
                    return;
                } else if ($scope.hasNativeBank && !$scope.hasNonNativeBank) { // only native
                    analyticsForAssessmentCreateCtrl('From a bank of questions (native)');
                    return;
                } else {
                    analyticsForAssessmentCreateCtrl('From a bank of questions (native or non-native)');
                }
                return;
            };

            $scope.next = function() {
                $scope.showErrorAlert = false;
                $scope.showFormError = true;
                if ($scope.createAssessmentForm.$invalid || (isMyLibraryView && !isProgramSelected)) {
                    $scope.showErrorAlert = true;
                } else {
                    if (isMyLibraryView) {
                        var masteryValue = $scope.assessment.isMastery ?
                            MY_LIBRARY_CONSTANTS.TELEMETRY_EVENT.YES :
                            MY_LIBRARY_CONSTANTS.TELEMETRY_EVENT.NO;
                        myLibraryEventTracking.onClickNextTBAT($scope.currentProgram.title, masteryValue);
                    }
                    $scope.isInProgress = true;
                    var params = {
                        title: $scope.assessment.title,
                        description: $scope.assessment.description,
                        isMastery: $scope.assessment.isMastery
                    };

                    if (!$scope.hasNativeBank && $scope.hasNonNativeBank) {
                        params.isNative = !$scope.assessment.useBank;
                    } else {
                        params.isNative = true;
                    }

                    if (params.isNative) {
                        params.testType = $scope.assessment.testType.toUpperCase();
                    } else {
                        params.testType = 'TEST';
                    }

                    Assessment.createAssessment($scope.currentProgram.id, params).then(function(result) {
                        var currentBase = $location.path().split('/assessment/')[0],
                            assessmentStepTwoPath = params.isNative ? 'edit' : 'addQuestionBank',
                            next;

                        //Native and noNative workflow needs myContent in path
                        if (/\/myLibrary$/.test(currentBase)) {
                            currentBase = [currentBase, 'program', $scope.programId, $scope.programVersion,
                                'assessment'].join('/');
                        } else if (!/\/myContent$/.test(currentBase)) {
                            currentBase = currentBase + '/myContent/assessment';
                        } else {
                            currentBase = currentBase + '/assessment';
                        }

                        next = [currentBase, result.id, result.version, assessmentStepTwoPath].join('/');

                        if (angular.isDefined(result.details) && angular.isDefined(result.details.id)) {
                            Assessment.loadAssessment(result.details.id).then(function(result) {
                                QuestionsInTestService.setQuestionsInTestCollection(result);
                            }, function(error) {
                                $log.error('Failed to load questions for an assessment', error);
                            });
                        }
                        $location.path(next);
                    });
                }

                trackNextAnalytics();
            };

            $scope.shouldShowSelectAssessmentType = function() {
                return (isMyLibraryView && isPlayerLoaded && $scope.canSelectAssessmentType()) ||
                   !isMyLibraryView && $scope.canSelectAssessmentType();
            };

            $scope.canSelectAssessmentType = function() {
                var hasNoBank = !$scope.hasNonNativeBank && !$scope.hasNativeBank;
                return hasNoBank ||
                    $scope.hasNativeBank ||
                    $scope.hasNonNativeBank && $scope.assessment && $scope.assessment.useBank === false;
            };

            $scope.back = function() {
                var fallback = $location.path().split('/assessment/')[0];
                $scope.goBack(fallback);
            };

            $scope.cancel = function() {
                $scope.back();
                Assessment.isNewTest = false;
            };

            $scope.shouldShowSpinner = function() {
                return isMyLibraryView && !isPlayerLoaded && isProgramSelected;
            };

            $scope.shouldShowAssessmentBank = function() {
                var hasNonNativeBank = !$scope.hasNativeBank && $scope.hasNonNativeBank;
                return (isMyLibraryView && isPlayerLoaded && hasNonNativeBank) || !isMyLibraryView && hasNonNativeBank;
            };

            $scope.shouldShowProgramSelectionError = function() {
                return $scope.showFormError && !isProgramSelected;
            };

            $scope.$on('$destroy', function() {
                Toast.close();
            });
        }
    ]);

