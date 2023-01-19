angular.module('Realize.assessment.assessmentBuilderCtrl', [
    'Realize.common.alerts',
    'Realize.content.model.contentItem',
    'Realize.analytics',
    'Realize.assessment.assessmentDataService',
    'Realize.myContent.myContentDataService',
    'ModalServices',
    'Realize.navigationService',
    'Realize.paths',
    'Realize.assessment.assessmentBuilderServiceInterface',
    'Realize.assessment.questionsInTestService',
    'Realize.constants.questionType',
    'rlzComponents.components.i18n',
    'rlzComponents.components.contentList.service.helper',
    'rlzComponents.components.myLibrary.services.myContent',
    'rlzComponents.components.myLibrary.myLibraryEventTracking',
    'rlzComponents.components.assessmentDialog.modal'
    ])
    .controller('BuilderCtrl', [
        '$scope',
        'BuilderData',
        '$rootScope',
        '$routeParams',
        '$location',
        '$window',
        '$log',
        'Analytics',
        'Assessment',
        'MyContent',
        'Modal',
        'lwcI18nFilter',
        'ROOT_PATH',
        'REST_PATH',
        'AssessmentBuilderServiceInterface',
        'InlineAlertService',
        'QuestionsInTestService',
        'QUESTION_TYPE',
        '$q',
        'webStorage',
        'contentListHelperService',
        'myContentService',
        'myLibraryEventTracking',
        'NavigationService',
        'assessmentDialogModal',
        '$currentUser',
        'featureManagementService',
        'locationUtilService',
        'penpalService',
        '$timeout',
        function($scope, BuilderData, $rootScope, $routeParams, $location, $window, $log, Analytics,
            Assessment, MyContent, Modal, lwcI18nFilter, rootPath, restPath,
            AssessmentBuilderServiceInterface, InlineAlertService, QuestionsInTestService, QUESTION_TYPE, $q,
            webStorage, contentListHelperService, myContentService, myLibraryEventTracking, NavigationService,
            assessmentDialogModal, currentUser, featureManagementService, locationUtilService, penpalService,
            $timeout) {
            'use strict';
            $scope.isAssessmentMaintenancePageEnabled = featureManagementService.isAssessmentMaintenancePageEnabled();
            if ($scope.isAssessmentMaintenancePageEnabled) {
                return;
            }

            var progressModal;
            var customService;
            var skipProgressModal;
            var exitBuilder;
            var searchPathRegex = /\/search/;
            var saveProgress = function() {
                var defer = $q.defer();
                AssessmentBuilderServiceInterface.Services.Builder().finalAllChanges();
                $scope.$on('assessmentBuilder.questionCollectionView.putSuccess', function(e, data) {
                    defer.resolve(data);
                });
                return defer.promise;
            };
            var checkUnsavedChanges = function(event, nextUrl) {
                if ($scope.isEditing) {
                    //Use assessment builder's unsaved change modal
                    if (event) {
                        event.preventDefault();
                    }
                    return AssessmentBuilderServiceInterface.Services.Builder().execute('commitChanges')
                        .then(function() {
                            $location.url(nextUrl);
                        });
                }
                if ($scope.eventName !== 'cancel' && !$scope.isSaving) {
                    if (event) {
                        event.preventDefault();
                    }
                    $scope.isSaving = true;

                    return saveProgress().then(function() {
                        if ($scope.isVersionFromToc && $location.path().indexOf('/myContent') === -1) {
                            webStorage.add('originalItemId', $scope.content.originalItemId);
                        }
                        $location.url(nextUrl);
                    });
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
            $scope.showExternalTocViewer = function() {
                return featureManagementService.isExternalTOCViewerEnabled();
            };

            $scope.showExternalMyLibraryViewer = function() {
                return featureManagementService.isMyLibraryViewerEnabled();
            };

            $scope.sendCustomizedItemStatus = function(originalId, customizedId, customizedStatus) {
                webStorage.add('customized.item.status',
                    { originalItemId: originalId, customizedItemId: customizedId, status: customizedStatus });
            };

            $scope.sendBuildTestStatus = function(testId, buildTestStatus) {
                webStorage.add('test.item.status',
                    { buildTestId: testId, status: buildTestStatus });
            };

            var analyticsForAssessmentBuilderCtrl = function(description) {
                Analytics.track('track.action', {
                    category: 'Programs',
                    action: 'Build a test',
                    label: description
                });
            };
            var canRemoveVersionOrCustomized = function() {
                return $scope.isCustomizedVersion() && $scope.content.active &&
                    $scope.content.externalSource !== 'User';
            };
            var myLibraryPath = '/myLibrary';
            var cssClassName = 'assessmentDialogModal';
            var navigationBackUrl = $location.search().backUrl;
            var browseButton = {
                label: lwcI18nFilter('customizeNavigationModal.action.browseButton'),
                ariaLabel: lwcI18nFilter('customizeNavigationModal.action.browseButton'),
                action: function() {
                    return saveProgress()
                        .then(function() {
                            NavigationService.navigateOutsideAngularContext($window.browseContentAppUrl);
                        });
                },
                className: 'button__browse',
                disabled: false,
            };
            var myLibraryButton = {
                label: lwcI18nFilter('customizeNavigationModal.action.myLibraryButton'),
                ariaLabel: lwcI18nFilter('customizeNavigationModal.action.myLibraryButton'),
                action: function() {
                    var next = $scope.getNextURL();
                    $location.search('backUrl', null).replace();
                    $scope.goBack(next, true);
                },
                className: 'button__myLibrary',
                disabled: false,
            };
            var buttons = [
                browseButton,
                myLibraryButton,
            ];

            var customizedAssessmentDescription = function() {
                return {
                    heading: '',
                    subHeading: lwcI18nFilter('customizeNavigationModal.subheading'),
                    message: lwcI18nFilter('customizeNavigationModal.message'),
                };
            };
            $scope.pageLoading();
            $scope.content = BuilderData;
            $scope.savedProgram = $rootScope.currentProgram;
            $scope.assignedStatus = $scope.content.assignedStatus;
            $scope.originalItemId = $scope.content.originalItemId;
            $scope.isAssigned = $scope.assignedStatus === 'ASSIGNED';
            $scope.messageType = 'error'; //default
            // non-Community collection = Pearson collection.
            $scope.isPearsonOriginal = $scope.content.contribSource !== 'My Uploads';
            $scope.isAssessmentImmutable = $scope.isPearsonOriginal;
            $scope.isEditing = false;
            $scope.attemptExit = false; //Flag to trigger exit builder after unsaved change modal
            $scope.titleMax = 50;
            $scope.printMenuBottom = false;
            $scope.messageSet = false;
            $scope.eventName = 'done';
            $scope.isSaving = false;
            $scope.showPrintButton = true;
            $scope.showReorder = true;
            $scope.removingQuestionslist = '';
            $scope.isVersionFromToc = false;

            if (Assessment.isNewTest) {
                addInlineMessage('success');
                $scope.messageSet = true;
            }

            var closeTurnInModal = function() {
                myLibraryButton.action();
            };

            var activateModal = function() {
                assessmentDialogModal.activate({
                    cssClass: cssClassName,
                    heading: '',
                    description: customizedAssessmentDescription(),
                    buttons: buttons,
                    closeButtonLabel: lwcI18nFilter('customizeNavigationModal.action.closeButton'),
                    closeAction: function() {
                        closeTurnInModal();
                    },
                });
            };

            $scope.getTitle = function() {
                if ($scope.mode === 'create') { //Step 1 build a test form
                    return lwcI18nFilter('global.navigation.goBack.a11y');
                }
                return $scope.content.title;
            };

            $scope.showQuicklinkBar = function() {
                return $scope.mode === 'edit';
            };

            $scope.isCustomizedPearsonTest = function() {
                return !$scope.isPearsonOriginal && !$scope.content.userCreated && $scope.content.active;
            };

            $scope.isCustomizedMyContentTest = function() {
                return $scope.content.userCreated && $scope.originalItemId;
            };

            $scope.isCustomizedVersion = function() {
                return $scope.isCustomizedPearsonTest() || $scope.isCustomizedMyContentTest();
            };

            $scope.isReorderVisible = function() {
                return $scope.questionCount > 1 && $scope.mode !== 'reorder' && !$scope.isAssessmentImmutable &&
                    $scope.showReorder;
            };

            $scope.isPrintVisible = function() {
                return $scope.questionCount > 0 && $scope.content.nativeAssessment === true && $scope.showPrintButton;
            };

            $scope.showRemoveButton = function() {
                return canRemoveVersionOrCustomized();
            };

            $scope.showViewOriginal = function() {
                return canRemoveVersionOrCustomized();
            };

            $scope.showViewCustomized = function() {
                return $location.search().customizedItemId || $scope.content.customizedItem;
            };

            $scope.$on('builder:immutable-assessment-loaded', function() {
                $log.log('[builder:immutable-assessment-loaded]');
                $scope.pageLoaded();
                $scope.isAssessmentImmutable = true;
            });

            exitBuilder = function(redirectToMyContent) {
                var next = $scope.getNextURL();
                // probably unnecessary...
                if (!($scope.$$phase || ($scope.$root && $scope.$root.$$phase))) {
                    $scope.$apply();
                }

                // [RGHT-2368] allow assessment builder to stop playing audio on navigating away from assessment
                $scope.$broadcast('preNavigationChange');

                if ($location.search().backUrl) {
                    NavigationService.navigateOutsideAngularContext(navigationBackUrl);
                    return;
                }

                //exempt search result from redirect to My Content
                if (!searchPathRegex.test(next) && redirectToMyContent) {
                    if (/\/myContent/.test(next)) {
                        $location.path(next);
                    } else {
                        $location.path(next + '/myContent');
                    }
                } else {
                    if (!searchPathRegex.test(next)) {
                        $scope.isVersionFromToc = true;
                    }
                    $scope.goBack(next, true);
                }
            };

            // update the inline message accordingly, if a new test is created or an existing test is customized
            function addInlineMessage(status) {
                var inlineTitle = 'assessmentBuilder.customizeAssessment.' + status + '.title';
                var inlineMessage = 'assessmentBuilder.customizeAssessment.' + status + '.message';
                InlineAlertService.addAlert(
                    $scope.content.id, {
                        type: 'success',
                        msg: ['<strong>',
                            lwcI18nFilter(inlineTitle),
                            '</strong>',
                            lwcI18nFilter(inlineMessage)
                        ].join(' ')
                    }
                );
                if ($scope.showExternalMyLibraryViewer()) {
                    var testStatus =  status === 'success' ? 'test_created_success' : 'test_edited_success';
                    $scope.sendBuildTestStatus($scope.content.id, testStatus);
                }
            }

            // update the timestamp on the equella item and remove the cached parent program.
            function saveSuccessHandler(isSecondTime) {
                if (!isSecondTime) {
                    Assessment.updateEquellaItemTimestamp($scope.content.assessmentId);
                }
                $scope.content.contribDate = new Date();

                // kill off the currentProgram so that it'll get re-fetched.  If we've changed the
                // title or updates the status on the customized item, this is necessary.
                if ($rootScope.currentProgram) {
                    $rootScope.currentProgram.programDirty = true;
                }

                $log.debug('saveSuccessHandler');
                if (!$scope.messageSet) {
                    if (Assessment.isNewTest) { // Setting inline success message, when a new test is created
                        addInlineMessage('success');
                        $scope.messageSet = true;
                    } else { // Setting inline edited message, when test is edited
                        addInlineMessage('edit');
                        $scope.messageSet = true;
                    }
                }
                if ($scope.showExternalTocViewer()) {
                    $scope.sendCustomizedItemStatus($scope.content.originalItemId, $scope.content.id, 'success');
                }
            }

            $scope.$on('summary:save:success', function(e, data) {
                $scope.isEditing = false;
                analyticsForAssessmentBuilderCtrl('Save');
                $log.debug('[assessment_builder : builder : summary:save:success]', arguments);
                Assessment.updateEquellaTitleAndDescription(data.id, data.assetTitle, data.assetDescription)
                    .then(function(data) {
                        // make the header on this page update...
                        var isSecondTime = true;
                        $scope.content.title = data.assetTitle;
                        saveSuccessHandler(isSecondTime);
                    });
            });

            // Handling events separately (instead of assessment-modified event). This avoids the extra unnecessary
            // update for the case of the summary save event, which fixes the equella 'item already locked' issue.
            $scope.$on('question:save:success', function() {
                $scope.questionSaved = true;
                saveSuccessHandler();
            });

            $scope.$on('question:remove:success', function() {
                analyticsForAssessmentBuilderCtrl('Remove question');
                saveSuccessHandler();
            });

            $scope.$on('question:reorder:success', function() {
                saveSuccessHandler();
                skipProgressModal = false;
            });

            $scope.$on('question:reorder:error', function() {
                skipProgressModal = false;
            });

            $scope.$on('question:reorder:before', function() {
                skipProgressModal = true;
            });

            $scope.$on('assessment:questionbanks:success', function() {
                $scope.questionSaved = true;
                saveSuccessHandler();
            });

            $scope.$on('builder:assessment-loaded', function() {
                $log.log('[builder:assessment-loaded]');
                $scope.pageLoaded();
            });

            $scope.$on('builder:assessment-modified', function() {
                $log.info('Assessment modified...');
                if (!$scope.content.active) {
                    MyContent.makeDefaultView($scope.content.id, true, true).then(function() {
                        $scope.content.active = true;
                    });
                }

                if (progressModal) { // if this doesn't exist now, it never got called in the first place
                    // this var is now a promise chain, so make sure we're open before we're closed.
                    progressModal.then(function() {
                        progressModal.progressComplete().then(function() {
                            Modal.hideDialog();
                        });
                    });
                }
            });

            $scope.$on('builder:modifying-assessment', function() {
                $log.info('MODIFYING ASSESSMENT');
                if (!!skipProgressModal) {
                    return;
                }
                progressModal = Modal.progressDialog($scope.$new(), {
                    progressHeader: lwcI18nFilter('assessmentBuilder.updateProgress.title'),
                    progressMessage: lwcI18nFilter('assessmentBuilder.updateProgress.message')
                }).then(function() {
                    // dont start progress until loaded
                    progressModal.fakeProgress(500);
                });
            });

            $scope.$on('builder:navigation', function(evt, mode) {
                $scope.mode = mode;
            });

            $scope.$on('builder:question:enterEdit', function() {
                $scope.isEditing = true;
                analyticsForAssessmentBuilderCtrl('Edit metadata');
            });

            $scope.$on('builder:question:leaveEdit', function() {
                $scope.isEditing = false;
            });

            $rootScope.$on('builder:unauthorized:access', function() {
                $scope.$emit('httpSessionTimedOut');
            });

            $scope.$on('builder:create:cancelled', function() {
                $scope.back();
            });

            $scope.$on('builder.navigate.addQuestionBank', function(event, insertPosition) {
                var basePath = $location.path().split('/edit')[0],
                    next = basePath + '/addQuestionBank/insert/' + insertPosition;

                if (angular.isDefined($scope.content) && angular.isDefined($scope.content.assessmentId)) {
                    Assessment.loadAssessment($scope.content.assessmentId).then(function(result) {
                        QuestionsInTestService.setQuestionsInTestCollection(result);
                    }, function(error) {
                        $log.error('Failed to load questions for an assessment', error);
                    });
                }
                analyticsForAssessmentBuilderCtrl('Add items from test bank');
                $location.path(next);
            });

            $scope.$on('builder.navigate.exitBuilder', function(event, eventName) {
                $scope.eventName = eventName;
                $scope.back(event);
                if ($location.path().indexOf('/myLibrary') === 0 && eventName.options.currentMode === 'edit') {
                    var programId = $routeParams.programId;
                    var versionId = $routeParams.programVersion;
                    if (programId) {
                        return myContentService.getContentTitle({
                            id: programId,
                            version: versionId,
                            level: 1,
                        }).then(function(title) {
                            myLibraryEventTracking.onCreatingTBAT(title);
                        });
                    }
                }
            });

            $scope.$on('$locationChangeStart', function(event) {
                if (!event || !event.targetScope ||
                    !event.targetScope.location || !event.targetScope.location.url) {
                    return;
                }
                var url = event.targetScope.location.url();
                checkUnsavedChanges(event, url);
            });

            $scope.$on('assessmentBuilder.hidePrintButton.success', function() {
                $scope.showPrintButton = false;
            });

            $scope.$on('assessmentBuilder.showPrintButton.success', function() {
                $scope.showPrintButton = true;
            });

            $scope.$on('assessmentBuilder.get.printList', function(event, data) {
                $scope.removingQuestionslist = data;
            });

            $scope.$on('assessmentBuilder.hideReorder.success', function() {
                $scope.showReorder = false;
            });

            $scope.$on('assessmentBuilder.unhideReorder.success', function() {
                $scope.showReorder = true;
            });

            $scope.print = function($event, key) {
                // todo.  Decouple this better...
                AssessmentBuilderServiceInterface.Services.Builder().getRemovingQuestionsList();

                var promise = AssessmentBuilderServiceInterface.Services.Builder().execute('commitChanges');
                promise.then(function() {
                    var hideQuestion = 'hide=';
                    if ($scope.removingQuestionslist.length) {
                        hideQuestion = hideQuestion + $scope.removingQuestionslist;
                    }

                    if (key === 'key') {
                        $window.open(rootPath + '/assessment/print/' + $scope.content.assessmentId +
                            '?showAnswers=true' + '&' + hideQuestion);
                    } else {
                        $window.open(rootPath + '/assessment/print/' + $scope.content.assessmentId +
                            '?' + hideQuestion);
                    }
                });
            };

            // let the builder set the initial mode...
            $scope.mode = undefined;

            $scope.navigation = function(mode) {
                $scope.mode = mode;
            };

            $scope.questionsMode = function() {
                $scope.mode = 'edit';
            };

            $scope.reorderMode = function() {
                $scope.mode = 'reorder';
                analyticsForAssessmentBuilderCtrl('Rearrange');
            };

            $scope.preview = function(e) {
                var promise = AssessmentBuilderServiceInterface.Services.Builder().execute('commitChanges');
                promise.then(function() {
                    var path;
                    e.stopPropagation();
                    path = $location.path() + '/preview';
                    $location.path(path);
                    $log.log('preview click', path);
                });
                analyticsForAssessmentBuilderCtrl('Preview');
            };

            $scope.$on('question:count:changed', function(evt, count) {
                $scope.questionCountChanged(count);
            });

            $scope.questionCountChanged = function(count) {
                $scope.questionCount = count;
            };

            $scope.showOriginalTest = function() {
                var promise = AssessmentBuilderServiceInterface.Services.Builder().execute('commitChanges');
                promise.then(function() {
                    var testId = $scope.content.id,
                        path = $location.path(),
                        next;

                    MyContent.getOriginalIdFromCustomized(testId).then(function(data) {
                        if ($routeParams.keywords && searchPathRegex.test(path)) {
                            next = path.split('/search')[0] + '/search/assessment/' +
                                data.originalItemId + '/0' + '/edit';
                        } else {
                            next = path.split('/assessment')[0] + '/assessment/' +
                                data.originalItemId + '/0' + '/edit';
                        }
                        $location.path(next);
                        $location.search('customizedItemId', $scope.content.id);
                        $location.search('customizedItemVersion', $scope.content.version);
                    });
                });
            };

            $scope.showCustomizedTest = function() {

                var path = $location.path(),
                    id = $location.search().customizedItemId ||  $scope.content.customizedItem.id,
                    version = $location.search().customizedItemVersion || $scope.content.customizedItem.version || 1,
                    next;

                if ($routeParams.keywords && searchPathRegex.test(path)) {
                    next = path.split('/search')[0] + '/search/assessment/' + id +
                        '/' + version + '/edit';
                } else {
                    next = path.split('/assessment')[0] + '/assessment/' + id +
                        '/' + version + '/edit';
                }

                $location.path(next);
                $location.search('customizedItemId', null);
                $location.search('customizedItemVersion', null);
            };
            var updateDefaultView = function() {
                var isDefaultView = false;
                if ($scope.isCustomizedVersion()) {
                    MyContent.makeDefaultView($scope.content.id, isDefaultView).then(function() {
                        var next = $scope.getNextURL(),
                            path = $location.path();
                        if (!(path.match(/\/search\/assessment\/[a-z0-9\-]+\/[0-9]+\/edit$/)) &&
                            $rootScope.currentProgram) {
                            // kill off cached version of the program
                            $rootScope.currentProgram.programDirty = true;
                        }

                        $location.path(next);

                        Modal.hideDialog();
                    });
                }
            };

            $scope.removeCustomized = function(e) {
                e.preventDefault();
                e.stopPropagation();

                var closeModal = function() {
                    Modal.hideDialog();
                };

                var confirm = function() {
                    updateDefaultView();
                };

                var modalScope = $scope.$new();
                modalScope.dialogId = 'removeCustomizedWarningModal';
                if ($scope.isAssigned) {
                    modalScope.title = lwcI18nFilter('assessmentBuilder.removeCustomizedTest.isAssigned.title');
                    modalScope.body = lwcI18nFilter(
                        'assessmentBuilder.removeCustomizedTest.isAssigned.message');
                    modalScope.isDismissible = false;
                    modalScope.buttons = [{
                        title: lwcI18nFilter('assessmentBuilder.action.cancel'),
                        clickHandler: closeModal
                    }, {
                        title: lwcI18nFilter('global.action.button.ok'),
                        clickHandler: confirm,
                        isDefault: true
                    }];
                    modalScope.dismissed = false;
                    modalScope.closeBtnClickHandler = closeModal;
                } else {
                    modalScope.title = lwcI18nFilter('assessmentBuilder.removeCustomizedTest.title');
                    modalScope.body = lwcI18nFilter('assessmentBuilder.removeCustomizedTest.message');
                    modalScope.isDismissible = false;
                    modalScope.buttons = [{
                        title: lwcI18nFilter('assessmentBuilder.action.cancel'),
                        clickHandler: closeModal
                    }, {
                        title: lwcI18nFilter('global.action.button.ok'),
                        clickHandler: confirm,
                        isDefault: true
                    }];
                    modalScope.dismissed = false;
                    modalScope.closeBtnClickHandler = closeModal;
                }
                Modal.showDialog('templates/partials/simpleDialog.html', modalScope);
            };
            var createModalNoQuestionAddedDialog = function() {
                var okHandler = function() {
                    var next = $scope.getNextURL();

                    // [RGHT-2368] allow assessment builder to stop playing audio on navigating away from assessment
                    $scope.$broadcast('preNavigationChange');

                    $scope.goBack(next, true);
                };

                var title = 'editAssessment.noQuestionAdded.title',
                    body = 'editAssessment.noQuestionAdded.body',
                    buttons = {
                        OK: {
                            title: 'editAssessment.noQuestionAdded.action.finish',
                            handler: okHandler,
                            isDefault: true
                        },
                        CANCEL: {
                            title: 'editAssessment.noQuestionAdded.action.continue'
                        }
                    };
                Modal.simpleDialog(title, body, buttons, {
                    id: 'noQuestionAddedWarningModal'
                });
            };
            var noQuestions = function() {
                var counts = $scope.questionCount;

                return !angular.isNumber(counts) || counts === 0;
            };

            var resetCurrentPageIndex = function() {
                var initialPage = 1;
                contentListHelperService.setCurrentPageIndex(initialPage);
            };

            $scope.getNextURL = function() {
                var pathArray;
                var next;
                var path = $location.path();
                var myLibraryDeeplinkPath = '/deeplink/myLibrary';
                var assessmentPathSplit = $location.path().split('/assessment/')[0];
                var deeplinkAssessmentRegex = /\/deeplink\/assessment\/[a-z0-9\-]+\/[0-9]+\/edit$/;
                var myLibraryRegex = /\/myLibrary\/program/;
                var myLibraryAssessmentPathRegex = /\/myLibrary\/assessment\/[a-z0-9\-]+\/[0-9]+\/edit$/;
                // jscs:disable maximumLineLength
                var deepLinkAssessmentPathRegex = /\/deeplink\/myLibrary\/program\/[a-z0-9\-]+\/[0-9]+\/assessment\/[a-z0-9\-]+\/[0-9]+\/edit$/;

                if ($routeParams.keywords && searchPathRegex.test(path)) {
                    next = $location.path().split('/search')[0] + '/search';

                    //Redirect to lesson if came from lesson search result
                    if ($routeParams.lessonId && $routeParams.lessonVersion) {
                        next = [next, 'lesson', $routeParams.lessonId, $routeParams.lessonVersion].join('/');
                    }
                } else if (myLibraryRegex.test(path) &&
                    !deepLinkAssessmentPathRegex.test(path) && !deeplinkAssessmentRegex.test(path)) {
                    contentListHelperService.setSelectedFacets(undefined);
                    contentListHelperService.setSearchKeyWord(undefined);
                    resetCurrentPageIndex();
                    next = myLibraryPath;
                } else if (myLibraryAssessmentPathRegex.test(path)) {
                    resetCurrentPageIndex();
                    next = assessmentPathSplit;
                } else if (currentUser.isCustomerAdmin &&
                    (deeplinkAssessmentRegex.test(path) || deepLinkAssessmentPathRegex.test(path))) {
                    resetCurrentPageIndex();
                    next = myLibraryDeeplinkPath;
                } else {
                    pathArray = $location.path().split('/assessment/');

                    // strip back the url, removing the last occurrence of '/assessment/' and everything after
                    // this handles cases where '/assessment/' also occurs earlier in url for whatever reason
                    pathArray.pop();
                    next = pathArray.join('/assessment/');
                }
                return next;
            };

            $scope.onBack = function($event) {
                $scope.eventName = 'cancel';
                $scope.back($event);
            };

            $scope.back = function($event) {
                if ($event) {
                    $event.stopPropagation();
                    $event.preventDefault();
                }

                //If viewing original, go back to customized view
                if ($scope.showViewCustomized()) {
                    $scope.showCustomizedTest();
                } else {
                    if ($scope.content.newlyCreated) {
                        MyContent.setSuccessMsgFlag('assessment', true);
                    }

                    if ($scope.mode === 'questionBanks') {
                        $event.currentTarget.blur(); //blur back button's focus
                        $scope.questionsMode();
                    } else if ($scope.mode === 'create') {
                        exitBuilder();
                    } else if ($scope.isEditing) {
                        $scope.attemptExit = true;
                        var promise = AssessmentBuilderServiceInterface.Services.Builder().execute(
                            'commitChanges');
                        promise.then(exitBuilder);
                    } else { //$scope.mode ==='edit'
                        if (noQuestions()) {
                            createModalNoQuestionAddedDialog();
                        } else if (currentUser.isCustomerAdmin && navigationBackUrl &&
                            $scope.eventName !== 'cancel') {
                            activateModal();
                        } else {
                            exitBuilder();
                        }
                    }
                }

                Assessment.isNewTest = false; // Resetting the newTest flag
            };

            var applyFunc = function(context, fn) {
                return function() {
                    var args = arguments;
                    if ($scope.$$phase || ($scope.$root && $scope.$root.$$phase)) {
                        return fn.apply(context, args);
                    } else {
                        $scope.$apply(function() {
                            return fn.apply(context, args);
                        });
                    }
                };
            };

            /*
             * Custom impl of the builder service that provides Realize specific error, alert and some
             * specialized AJAX handling.
             */
            customService = {};
            customService.showAlert = applyFunc(customService, function(type, message, element) {
                if (type === 'ERROR') {
                    $scope.attemptExit = false; //clear flag
                }
                $scope.message = message;
                $scope.target = element;
                $scope.messageType = type.toLowerCase();

                // hide any modal that might be showing so that error messages are visible
                Modal.hideDialog();
            });

            customService.showDialog = applyFunc(customService, function(modalParams) {
                var dialogId = modalParams.id,
                    suppressionId,
                    suppressed,
                    modalScope,
                    wrapHandler,
                    showDialog = true;

                $log.log('dialogCallbackFn modalParams', modalParams);

                $rootScope.viewLoading = false;

                // check if the user has an option to dismiss this type of dialog forever
                if (modalParams.isDismissible) {

                    suppressionId = dialogId + '.dismiss.forever';
                    suppressed = $scope.currentUser.getAttribute(suppressionId);
                    if (suppressed) {
                        // do default action
                        modalParams.defaultClickHandler.apply(null);
                        showDialog = false;
                    }
                }

                if (showDialog) {
                    // display warning modal
                    modalScope = $scope.$new();
                    modalScope.sentResponse = false;

                    wrapHandler = function(button) {
                        return function() {
                            // 'do not show me again' selection will be saved only if the user clicks the default button
                            if (button.isDefault && modalScope.dismissed) {
                                $scope.currentUser.$toggleAttribute(suppressionId);
                            }

                            //Hide dialog before working on user selection
                            Modal.hideDialog();

                            // then original handler
                            button.clickHandler.apply(null);
                            modalScope.sentResponse = true;
                        };
                    };

                    modalScope.dialogId = modalParams.dialogId;
                    modalScope.title = modalParams.title;
                    modalScope.body = modalParams.body;
                    modalScope.isDismissible = modalParams.isDismissible;

                    // Note - per the UX design of Pete, the default button should be the last in the row of buttons.
                    // To keep things simple, we are assuming that the buttons array
                    // has button items in an order that meets Pete's requirements.
                    modalScope.buttons = $.Enumerable.From(modalParams.buttons)
                        .Select(function(button) {
                            return {
                                buttonType: button.isDefault ? 'ok' : 'cancel', //TODO: figure out whats wrong here
                                title: button.title,
                                isDefault: button.isDefault,
                                clickHandler: wrapHandler(button)
                            };
                        })
                        .ToArray();

                    modalScope.closeBtnClickHandler = function() {
                        if (angular.isFunction(modalParams.closeClickHandler)) {
                            modalParams.closeClickHandler();
                            modalScope.sentResponse = true;
                        }
                        $scope.attemptExit = false;
                        Modal.hideDialog();
                    };

                    modalScope.$on('modal.hidden', function() {
                        if (!modalScope.sentResponse && angular.isFunction(modalParams.closeClickHandler)) {
                            modalParams.closeClickHandler();
                            modalScope.sentResponse = true;
                        }
                    });

                    Modal.showDialog('templates/partials/simpleDialog.html', modalScope);
                }
            });

            customService.createAssessment = function(assessment) {
                var promise;

                this._trigger('assessment:create:before', assessment);

                promise = this._ajax({
                    url: this._buildPath('my_library', $routeParams.programId, 'assessments'),
                    type: 'POST',
                    contentType: 'application/json; charset=UTF-8',
                    dataType: 'json',
                    data: JSON.stringify(assessment)
                });

                this._fireEvents(promise, 'assessment:create:success', 'assessment:create:error');

                return promise.then(function(data) {

                    InlineAlertService.addAlert(
                        data.id, {
                            type: 'success',
                            msg: [
                                lwcI18nFilter(
                                    'assessmentBuilder.createAssessment.success.title'),
                                lwcI18nFilter(
                                    'assessmentBuilder.createAssessment.success.message')
                            ].join(' ')
                        }
                    );

                    applyFunc(customService, function() {
                        // rather than allowing the builder to switch modes,
                        // just switch urls to put myself into edit mode.  This makes
                        // going to preview and then back possible without a lot
                        // of 'back' magic in preview or adding special magic to preview()
                        // to calculate the preview URL.
                        // Also, more reliable in case of  F5 refresh
                        if (progressModal) {
                            progressModal.progressComplete().then(function() {
                                $location.path([$location.path(), data.id, data.version,
                                    'edit'
                                ].join('/'));
                            });
                        } else {
                            $location.path([$location.path(), data.id, data.version, 'edit'].join(
                                '/'));
                        }
                    })();

                    // technically not necessary since we're switching locations, but
                    // go ahead and resolve with the AssessmentDetails object expected
                    // by the builder.
                    return data.details;
                });
            };

            customService.listQuestionBanks = function(program, page, pageSize, isNativeAssessment) {
                var promise = this._ajax({
                    url: [restPath, 'assessment/questionbanks'].join('/'),
                    type: 'GET',
                    dataType: 'json',
                    data: {
                        programs: program,
                        // need to convert from page # to 1 based start index...
                        page: page + 1,
                        pageSize: pageSize,
                        nativeBanks: isNativeAssessment
                    }
                });

                return promise.then(function(data) {
                    // convert to a format the model expects.   Ideally, client and server
                    // should agree, but server uses a format that is a bit more difficult
                    // to deal with (specifically using start index vs. page number)
                    data.total = data.totalQuestionBanks;
                    data.page = page;
                    data.nativeAssessment = isNativeAssessment;
                    for (var i = 0; i < data.questionBanks.length; ++i) {
                        var bank = data.questionBanks[i];
                        bank.assessmentId = bank.questionBankId;
                        bank.totalQuestions = bank.questions.length;
                        if (isNativeAssessment) {
                            bank.multipleChoiceCount = 0;
                            bank.griddedResponseCount = 0;
                            for (var j = 0; j < bank.questions.length; ++j) {
                                var question = bank.questions[j];
                                if (question.questionType === QUESTION_TYPE.MULTIPLE_CHOICE) {
                                    bank.multipleChoiceCount++;
                                } else if (question.questionType === QUESTION_TYPE.GRIDDED_RESPONSE) {
                                    bank.griddedResponseCount++;
                                }
                            }
                        }
                    }

                    delete data.totalQuestionBanks;

                    return data;
                });
            };

            AssessmentBuilderServiceInterface.Services.Builder.setImplementation(_.extend(
                AssessmentBuilderServiceInterface.Services.Builder.getDefaultImplementation(),
                customService
            ));

            $scope.contentLibraryValue = ($scope.content.library.length > 0) ? $scope.content.library[0] : null;

            $scope.shouldIncludeQuestionBankSupport = function() {
                var includeSupport = false;
                if (!$scope.showViewCustomized()) {
                    includeSupport = !!$rootScope.currentProgram || !!$scope.contentLibraryValue;
                }
                return includeSupport;
            };

            $scope.builderConfigOptions = {
                fixedHeaderHeight: $('#globalNav').outerHeight(true), // #wrong!
                useDropdownForAddQuestion: true, // support multichoice and gridded response questions
                navigationFn: $scope.navigation, // show 'question' mode or 'reorder' mode
                ckeditorSkin: 'pete',
                // show the builder in read-only mode if this assessment is a Pearson original, or if
                // the assessment is currently assigned
                isReadOnly: $scope.isPearsonOriginal || $scope.isAssigned,
                program: $rootScope && $rootScope.currentProgram && $rootScope.currentProgram.programs &&
                    $rootScope.currentProgram.programs[0] ? $rootScope.currentProgram.programs[0] :
                    $scope.contentLibraryValue,
                defaultThumbnailURL: rootPath +
                    '/realizeit/skins/default/images/mediatype/icon/question_bank@2x.png',
                questionCountChangedFn: $scope.questionCountChanged,
                includeQuestionBankSupport: $scope.shouldIncludeQuestionBankSupport(),
            };
        }
    ]);
