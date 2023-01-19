angular.module('Realize.assessment.essayPromptCtrl', [
    'Realize.assessment.assessmentDataService',
    'rlzComponents.components.contentList.service.helper',
    'rlzComponents.components.myLibrary',
    'rlzComponents.components.myLibrary.constants'
])
    .controller('EssayPromptCtrl', [
        '$scope',
        '$location',
        'Assessment',
        'InlineAlertService',
        'lwcI18nFilter',
        '$log',
        'resolveEssayPromptBuilder',
        'myLibraryEventTracking',
        'contentListHelperService',
        'MY_LIBRARY_CONSTANTS',
        'featureManagementService',
        function($scope, $location,  Assessment, InlineAlertService, lwcI18nFilter, $log, resolveEssayPromptBuilder,
            myLibraryEventTracking, contentListHelperService, MY_LIBRARY_CONSTANTS, featureManagementService) {
            'use strict';
            var self = this;
            // search api does not return newly created essay prompts on search/listing(when queried immediately)
            // on MyLibrary, as a workaround, we delay the redirect back to myLibrary by 1sec,
            // in hope that the new item get indexed for search api
            var redirectDelayInMs = 1000;

            $scope.isAssessmentMaintenancePageEnabled = featureManagementService.isAssessmentMaintenancePageEnabled();

            if ($scope.isAssessmentMaintenancePageEnabled) {
                return;
            }

            self.essayPrompt = {};

            self.essayPromptContent = resolveEssayPromptBuilder;
            self.showHeadsUpModal = self.essayPromptContent.isNewTest;
            self.initialpage = 1;

            self.save = function() {
                if ($location.path().search('/myLibrary') === 0) {
                    var gradeLevel = self.essayPrompt.grade === MY_LIBRARY_CONSTANTS.TELEMETRY_EVENT.LOW ?
                        MY_LIBRARY_CONSTANTS.TELEMETRY_EVENT.LOW_LEVEL :
                        MY_LIBRARY_CONSTANTS.TELEMETRY_EVENT.HIGH_LEVEL;
                    myLibraryEventTracking.onWriteEssayPrompt(gradeLevel);
                }
                var params;

                self.showHeadsUpModal = false;
                self.showFormError = true;
                if (self.essayPromptForm.$invalid) {
                    self.showErrorAlert = true;
                    return;
                } else {
                    self.showErrorAlert = false;
                }
                self.isInProgress = true;
                params = {
                    title: self.essayPrompt.promptTitle,
                    prompt: self.essayPrompt.promptDescription,
                    grade: self.essayPrompt.grade,
                    essayPromptType: self.essayPrompt.promptType
                };
                self.isFromMyLibraryPage = $location.path().search('myLibrary') > 0;
                self.currentProgramId = self.isFromMyLibraryPage ? $scope.currentUser.userId : $scope.currentProgram.id;
                self.redirectPath = self.isFromMyLibraryPage ? '/myLibrary' : '/myContent';
                self.replacePath = self.isFromMyLibraryPage ? '/myLibrary/essayPrompt' : '/assessment/essayPrompt';

                if (self.essayPromptContent.isNewTest) {
                    Assessment.createEssayPrompt(self.currentProgramId, params)
                    .then(function(result) {
                        if (self.isFromMyLibraryPage) {
                            contentListHelperService.setSelectedFacets(undefined);
                            contentListHelperService.setSearchKeyWord(undefined);
                            contentListHelperService.setCurrentPageIndex(self.initialpage);
                        }
                        redirectToMyContent(result, 'success', $location.path()
                            .replace(self.replacePath, self.redirectPath));
                    }, function(error) {
                        $log.error('Failed to create essay prompt', error);
                        self.isInProgress = false;
                    });
                } else {
                    Assessment.editEssayPrompt(self.essayPromptContent.id, params).then(function(result) {
                        redirectToMyContent(result, 'edit', $location.path().split('/assessment/essay')[0]);
                    }, function(error) {
                        $log.error('Failed to edit essay prompt', error);
                        self.isInProgress = false;
                    });

                }
            };

            self.essayPrompt.promptTitle =  self.essayPromptContent.isNewTest ? '' : self.essayPromptContent
                .questions[0].essayPrompt.title;
            self.essayPrompt.promptDescription =  self.essayPromptContent.isNewTest ? '' : self.essayPromptContent
                .questions[0].essayPrompt.prompt;
            self.essayPrompt.grade =  self.essayPromptContent.isNewTest ? 'low' : self.essayPromptContent
                .questions[0].essayPrompt.grade;
            self.essayPrompt.promptType =  self.essayPromptContent.isNewTest ? 'argument' : self.essayPromptContent
                .questions[0].essayPrompt.essayPromptType;

            function addInlineMessage(status, resultId) {
                var promptSuccessNotification = 'essayPrompt.successNotification.createdPrompt.',
                    inlineTitle = promptSuccessNotification + status + '.title',
                    inlineMessage = promptSuccessNotification + status + '.message';
                InlineAlertService.addAlert(
                    resultId, {
                        type: 'success',
                        msg: ['<strong>',
                            lwcI18nFilter(inlineTitle),
                            '</strong>',
                            lwcI18nFilter(inlineMessage)
                        ].join(' ')
                    }
                );
            }

            function redirectToMyContent(result, status, myContentPath) {
                if (angular.isDefined(result.details) && angular.isDefined(result.details.id)) {
                    setTimeout(function() {
                        $scope.$evalAsync(function() {
                            addInlineMessage(status, result.id);
                            $location.path(myContentPath);
                        });
                    }, redirectDelayInMs);
                }
            }

            self.back = function() {
                $scope.goBack($location.path().split('/assessment/')[0]);
            };

            self.cancel = function() {
                self.back();
            };
        }
    ]);
