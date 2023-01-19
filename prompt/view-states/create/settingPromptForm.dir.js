angular.module('Realize.Prompt.Setting', [
    'Realize.common.alerts',
    'Realize.paths',
    'Realize.ui.modal.UnsavedChangesModal',
    'Realize.Prompt.promptApiUtilService',
    'Realize.user.currentUser',
    'Realize.ui.scrollTopOnLoad',
    'Realize.navigationService',
    'Realize.analytics',
    'Realize.content.model.contentItem',
    'Realize.prompt.constants'
])
    .controller('settingPromptFormCtrl', [
        function() {}
    ])
    .directive('settingPromptForm', [
        '$log',
        'PATH',
        'lwcI18nFilter',
        '$currentUser',
        'UnsavedChangesModal',
        '$rootScope',
        'promptApiUtilService',
        'MEDIA_PATH',
        'NavigationService',
        '$routeParams',
        '$templateCache',
        '$location',
        '$q',
        'InlineAlertService',
        'Content',
        'PROMPT_CONSTANTS',
        'locationUtilService',
        'penpalService',
        function($log, PATH, lwcI18nFilter, $currentUser, UnsavedChangesModal, $rootScope, promptApiUtilService,
            mediaPath, NavigationService, $routeParams, $templateCache, $location, $q, InlineAlertService,
            Content, PROMPT_CONSTANTS, locationUtilService, penpalService) {
            'use strict';
            return {
                templateUrl: PATH.TEMPLATE_CACHE + '/prompt/view-states/create/settingPromptForm.dir.html',
                controller: 'settingPromptFormCtrl',
                controllerAs: 'settingPromptFormCtrl',
                link: function($scope) {
                    var promptColors = ['brick', 'green', 'teal', 'blue', 'black'],
                        thumbnailsRoot = mediaPath + '/skins/default/images/prompt/',
                        extension = '.svg',
                        fileNamePrefix = 'discuss_prompt_icon_',
                        isPopupOpen = false,
                        afterSuccessfulUpdateFormEvent = function() {
                            $scope.isSaveInProgress = false;
                            $scope.createPromptForm.$setPristine();
                            if (!!$location.search().view) {
                                $location.search('view', null);
                                NavigationService.back('/search', true);
                            }
                            if (!$scope.isRoutingListView) {
                                if (!!$scope.config) {
                                    $scope.$emit('prompt.view.change', $scope.config);
                                } else {
                                    $scope.$emit('prompt.view.change', 'list');
                                }
                            }
                        };

                    $scope.currentUser = $currentUser;
                    $scope.thumbnails = [];
                    $scope.isSaveInProgress = false;
                    $scope.isSaveErrorMessageVisible = false;
                    $scope.showErrorAlert = false;
                    $scope.isEdited = false;
                    if (!$scope.prompt) {
                        $scope.prompt = {};
                    }

                    $scope.thumbnails = promptColors.map(function(promptColor) {
                        var promptImage = {
                            caption: lwcI18nFilter('prompt.createForm.promptImageCaption') +
                                lwcI18nFilter('global.color.' + promptColor),
                            image: fileNamePrefix + promptColor + extension
                        };
                        promptImage.url = thumbnailsRoot + promptImage.image;
                        return promptImage;
                    });

                    //select a default thumbnail (brick color) url in case one is not selected by the user
                    $scope.discussPromptBubbleUrl = angular.isDefined($scope.prompt.thumbnails) ?
                        $scope.prompt.thumbnails : $scope.thumbnails[0].url;

                    $scope.chooseDiscussPromptBubble = function(thumbnail) {
                        $scope.discussPromptBubbleUrl = thumbnail.url;
                        $scope.selectedThumbnail = thumbnail;
                    };

                    $scope.isCreateView = function() {
                        return $scope.currentView === 'create';
                    };

                    $scope.firstVisit = {
                        showAlert: function() {
                            return !$scope.currentUser.getAttribute('prompt.info.seen') && $scope.isCreateView();
                        },
                        title: lwcI18nFilter('prompt.firstVisitInfo.title'),
                        description: lwcI18nFilter('prompt.firstVisitInfo.description'),
                        closeFn: function() {
                            $scope.currentUser.setAttribute('prompt.info.seen', true);
                        }
                    };

                    $scope.$on('prompt.createView.change', function(event, view) {
                        if (!$scope.isSavePromptDisabled()) {
                            $scope.unsavedChangesModal.showDialog().then(function() {
                                $scope.$emit('prompt.view.change', view);
                            });
                        } else {
                            $scope.$emit('prompt.view.change', view);
                        }
                    });

                    $scope.back = function(event) {
                        var stackPath = NavigationService.stack[NavigationService.stack.length - 1].split('/classes'),
                            view = $location.search().activeTab === 'myPrompts' ? 'list' : 'active';
                        if (event) {
                            event.stopPropagation();
                        }
                        if ((_.isEmpty(NavigationService.stack) || (!!$scope.promptList && !!$scope.activeList &&
                            stackPath.length > 1 && !$scope.activeList.length)) && $scope.isSavePromptDisabled()) {
                            $rootScope.viewLoading = false;
                            $location.search('promptView', null);
                            $scope.$emit('prompt.view.change', view);
                        } else if (stackPath.length > 0 && stackPath[0].indexOf('search') &&
                            !!$location.search().view) {
                            $rootScope.viewLoading = false;
                            $location.search('view', null);
                            NavigationService.back('/search', true);
                        } else if (!$scope.isSavePromptDisabled()) {
                            $scope.unsavedChangesModal.showDialog().then(function() {
                                if ($scope.savePressed) {
                                    return;
                                } else if (!!$scope.config) {
                                    $scope.$emit('prompt.view.change', $scope.config);
                                } else if (!!$scope.promptList && $scope.promptList.length) {
                                    $scope.$emit('prompt.view.change', 'list');
                                } else {
                                    $scope.$emit('prompt.view.change.zeroState');
                                }
                            });
                        } else if (!!$scope.config) {
                            $scope.$emit('prompt.view.change', $scope.config);
                        } else {
                            $scope.$emit('prompt.view.change', view);
                        }
                    };

                    $scope.savePrompt = function() {
                        $scope.savePressed = true;
                        $scope.isEdited = false;
                        $scope.showErrorAlert = false;
                        if ($scope.createPromptForm.$invalid) {
                            $scope.showErrorAlert = true;
                            //$scope.isRoutingListView = false;
                            return $q.reject('form is invalid!');
                        } else {
                            var prompt = {
                                title: $scope.prompt.title,
                                body: $scope.prompt.body,
                                thumbnailUrl: $scope.discussPromptBubbleUrl
                            };
                            $scope.isSaveInProgress = true;
                            if ($scope.isCreateView()) {
                                return promptApiUtilService.savePromptData(prompt, $routeParams.classId)
                                    .then($scope.saveSuccessfulEvent, $scope.saveFailedEvent)
                                    .finally(function() {
                                        afterSuccessfulUpdateFormEvent();
                                    });
                            } else {
                                return promptApiUtilService.updatePrompt($scope.prompt.id, prompt)
                                    .then($scope.editSuccessfulEvent, $scope.saveFailedEvent)
                                    .finally(function() {
                                        afterSuccessfulUpdateFormEvent();
                                    });
                            }
                            $scope.sendPenpalEvent('CHANGES_SAVED', {});
                        }

                        if (!$rootScope.viewLoading) {
                            $rootScope.viewLoading = true;
                        }
                        promptApiUtilService.analyticsForPrompt(PROMPT_CONSTANTS.ANALYTICS.SAVE_PROMPT);
                    };

                    $scope.$on('prompt.create-view.saveFailed', function(e, err) {
                        $scope.isLoading = false;
                        $scope.isSaveErrorMessageVisible = true;
                        $log.error('Error saving!', err);
                    });

                    $scope.saveSuccessfulEvent = function(prompt) {
                        promptApiUtilService.analyticsForPrompt(PROMPT_CONSTANTS.ANALYTICS.CREATE_SAVE_PROMPT);

                        $scope.promptList.unshift(new Content(prompt));
                        InlineAlertService.addAlert(
                            prompt.id,
                            {
                                type: 'success',
                                msg: [
                                    '<strong>',
                                    lwcI18nFilter('prompt.successNotification.createdPrompt.success.title'),
                                    '</strong>',
                                    lwcI18nFilter('prompt.successNotification.createdPrompt.success.message')
                                ].join('')
                            }
                        );
                        $scope.setUnsavedChanges();
                    };

                    window.addEventListener('message', function(event) {
                        if (event.data === 'SAVE_CHANGES') {
                            isPopupOpen = true;
                            $scope.savePrompt();
                        }
                    });

                    $scope.editSuccessfulEvent = function(prompt) {
                        $scope.setUnsavedChanges();
                        promptApiUtilService.analyticsForPrompt(PROMPT_CONSTANTS.ANALYTICS.EDIT_SAVE_PROMPT);
                        var successEditAlertMsg = [
                            '<strong>',
                            lwcI18nFilter('prompt.successNotification.editedPrompt.title'),
                            '</strong>',
                            lwcI18nFilter('prompt.successNotification.editedPrompt.message')
                        ].join(''),
                        contentItem = new Content(prompt);
                        if (!!$scope.promptList && $scope.promptList.length || !!$location.search().view) {
                            if (!!$scope.promptList && $scope.promptList.length) {
                                for (var i = 0; i < $scope.promptList.length; i++) {
                                    if ($scope.promptList[i].id === $scope.prompt.id) {
                                        $scope.promptList[i] = contentItem;
                                    }
                                }
                            }

                            InlineAlertService.addAlert(
                                prompt.id,
                                {
                                    type: 'success',
                                    msg: successEditAlertMsg
                                }
                            );
                        } else {
                            $scope.$emit('prompt.detail.update', contentItem);

                            $scope.$emit('editedPrompt.alert.toggle', {
                                show: true,
                                alertDetails: {
                                    msg: successEditAlertMsg,
                                    type: 'success',
                                    icon: 'ok-sign'
                                },
                                assignedItem: contentItem
                            });
                        }
                    };

                    $scope.setUnsavedChanges = function() {
                        var payload = {hasUnsavedChanges: false};
                        $scope.sendPenpalEvent('UNSAVED_CHANGES', payload);
                        if (isPopupOpen) {
                            $scope.sendPenpalEvent('CHANGES_SAVED', {});
                        }
                    };

                    $scope.saveFailedEvent = function(err) {
                        $scope.isLoading = false;
                        $scope.isSaveErrorMessageVisible = true;
                        $log.error('Error saving!', err);
                        $scope.setUnsavedChanges();
                    };

                    $scope.sendPenpalEvent = function(action, payload) {
                        if (locationUtilService.isDeeplinkDiscussTabActive()) {
                            penpalService.connectToParent().then(function(connection) {
                                connection.parent.exec(action, payload);
                            });
                        }
                    };

                    $scope.unsavedChangesModal = new UnsavedChangesModal($scope.savePrompt.bind($scope, true));
                    $scope.$watch('createPromptForm.$dirty', function(value) {
                        $scope.isEdited = value;
                        if (value && $scope.createPromptForm.$valid) {
                            var payload = { hasUnsavedChanges: true };
                            $scope.sendPenpalEvent('UNSAVED_CHANGES', payload);
                        }
                    }, true);

                    $scope.$watch('createPromptForm.$invalid', function(value) {
                        if (value && $scope.isEdited) {
                            var payload = {hasUnsavedChanges: false};
                            $scope.sendPenpalEvent('UNSAVED_CHANGES', payload);
                        }
                    }, true);

                    $scope.$watch('createPromptForm.$valid', function(value) {
                        if (value && $scope.isEdited) {
                            var payload = {hasUnsavedChanges: true};
                            $scope.sendPenpalEvent('UNSAVED_CHANGES', payload);
                        }
                    }, true);

                    $scope.$parent.$on('$locationChangeStart', function(evt) {
                        var isUserSelectedThumbnail = $scope.isCreateView() && $scope.selectedThumbnail ?
                            $scope.thumbnails[0].url !== $scope.selectedThumbnail.url : false;
                        isUserSelectedThumbnail = isUserSelectedThumbnail || $scope.selectedThumbnail &&
                            angular.isDefined($scope.prompt.thumbnails) &&
                            $scope.prompt.thumbnails !== $scope.selectedThumbnail.url;
                        if ($scope.createPromptForm && ($scope.createPromptForm.$dirty || isUserSelectedThumbnail &&
                            $scope.isSaveInProgress)) {
                            $rootScope.viewLoading = false;
                            $scope.isRoutingListView = true;
                            $scope.unsavedChangesModal.showDialog(evt).then(function() {
                                if (!$rootScope.viewLoading) {
                                    $rootScope.viewLoading = true;
                                }
                            });
                        }
                    });

                    $scope.$on('$destroy', function() {
                        $templateCache.remove(PATH.TEMPLATE_CACHE +
                            '/prompt/view-states/create/settingPromptForm.dir.html');
                    });

                    $scope.isSavePromptDisabled = function() {
                        return ($scope.createPromptForm.$pristine && (_.isUndefined($scope.selectedThumbnail) ||
                         (($scope.isCreateView() && $scope.thumbnails[0].url === $scope.selectedThumbnail.url) ||
                         angular.isDefined($scope.prompt.thumbnails) &&
                         $scope.prompt.thumbnails === $scope.selectedThumbnail.url))) || $scope.isSaveInProgress;
                    };

                    setTimeout(function() {
                        $('#prompt-title').focus();
                    }, 2000);

                }

            };
        }
    ]);
