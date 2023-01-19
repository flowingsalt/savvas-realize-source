angular.module('Realize.content.contentController', [
        'Realize.content.contentViewerService',
        'Realize.assignment.facadeService',
        'Realize.reporting.data.TrackingService',
        'Realize.recommendation.facadeService',
        'Realize.user.currentUser',
        'Realize.navigationService',
        'Realize.tinCanConfigService',
        'lst.rating.ui.component',
        'Realize.common.gradedStarDirective',
        'Realize.constants.mediaType',
        'Realize.content.viewProgress',
        'Realize.paths',
        'Realize.content.constants',
        'angular.status.bar.notification.ui.component',
        'Realize.common.popOverComponent',
        'Realize.content.contentResolver',
        'Realize.content.contentSourceService',
        'Realize.common.handlePostMessage',
        'Realize.assignment.constants',
        'Realize.assignment.utilService',
        'rlzComponents.components.rubricSidePanel',
        'rlzComponents.assignmentTelemetryModule',
        'rlzComponents.routedComponents.assignments.constants',
        'rlzComponents.components.featureManagement',
        'Realize.constants.googleClassroom',
        'rlzComponents.contentViewerTelemetryModule',
        'rlzComponents.contentViewerTelemetryModule',
        'rlzComponents.components.domainWarningModal.modal',
        'rlzComponents.components.assessmentDialog.modal',
        'rlzComponents.assignmentViewerTelemetryModule',
    ])
    .controller('ContentCtrl', [
        '$sce',
        '$scope',
        '$rootScope',
        '$location',
        '$log',
        '$window',
        '$filter',
        'ContentViewerData',
        'ContentViewer',
        'AssignmentFacadeService',
        'TinCanConfigService',
        '$routeParams',
        'TrackingService',
        'BrowserInfo',
        'MediaQuery',
        '$timeout',
        'RecommendationFacadeService',
        '$currentUser',
        'NavigationService',
        'MEDIA_TYPE',
        'COMPONENT_TEMPLATE_PATH',
        'ViewProgressService',
        'lwcI18nFilter',
        'Modal',
        'PATH',
        'CONTENT_CONSTANTS',
        'lstNotificationService',
        'ContentResolver',
        'ContentSource',
        'sendPostMessage',
        'assignmentViewerService',
        '$document',
        '$q',
        'assignmentCompletedAlertHelperService',
        'ASSIGNMENT_CONSTANTS',
        'AssignmentUtil',
        'telemetryUtilitiesService',
        'rubricEventTracking',
        'assignmentTelemetryService',
        'featureManagementService',
        'GOOGLE_CLASSROOM',
        'contentViewerTelemetryService',
        'domainWarningModal',
        'assessmentDialogModal',
        'penpalService',
        'assignmentViewerTelemetryService',
        'heartbeatContentViewerService',
        function($sce, $scope, $rootScope, $location, $log, $window, $filter, ContentViewerData, ContentViewer,
            AssignmentFacadeService, TinCanConfigService, $routeParams, TrackingService, BrowserInfo, MediaQuery,
            $timeout, RecommendationFacadeService, $currentUser, NavigationService, MEDIA_TYPE, COMPONENT_TEMPLATE_PATH,
            ViewProgressService, lwcI18nFilter, Modal, PATH, CONTENT_CONSTANTS, lstNotificationService,
            ContentResolver, ContentSource, sendPostMessage, assignmentViewerService, $document, $q,
            assignmentCompletedAlertHelperService, ASSIGNMENT_CONSTANTS, AssignmentUtil,
            telemetryUtilitiesService, rubricEventTracking, assignmentTelemetryService, featureManagementService,
            GOOGLE_CLASSROOM, contentViewerTelemetryService, domainWarningModal, assessmentDialogModal,
            penpalService, assignmentViewerTelemetryService, heartbeatContentViewerService) {
            'use strict';

            angular.element('html').addClass('contentViewer');
            var fixedTopElement;
            var getFixedTopElement = function() {
                if (!fixedTopElement) {
                    fixedTopElement = $window.document.getElementById('contentViewerFixedHeader');
                }
                return fixedTopElement;
            };

            $rootScope.viewLoading = true;
            $scope.currentUser = $currentUser;
            $scope.isStudent = $currentUser.isStudent;
            $scope.isEditing = $routeParams.editing;
            $scope.assignmentStatus = 'loading';
            $scope.isRubricInteractive = false;
            $scope.isAdaptive = false;
            $scope.isReview = $currentUser.isTeacher;
            $scope.isLtiaUser = $scope.currentUser.isLtiAUser;
            $scope.isReady = false;
            $scope.enableContinueButtonToggle = $window.toggleSubmitAndContinueButton === 'true';
            $scope.userAssignmentId = $routeParams.userAssignmentId || $routeParams.assignmentUserId;
            $scope.studentId = $location.search().studentId;
            $scope.parentUserAssignmentId = $routeParams.userAssignmentId || $routeParams.assignmentUserId;
            $scope.noOfStarsAnimated = 0;
            $scope.viewProgressPage = COMPONENT_TEMPLATE_PATH + '/content/viewProgress.html';
            $scope.hashCharRegPattern = /#/g;
            $scope.hashCharURIEncode = '%23';
            $scope.starPopOverType = null;
            $scope.stopTrackingTimeSpent = null;
            $scope.isTrackingRecommendation = false;
            $scope.isAdaptiveLessonLevelAssignment = false;
            var studentInfo = {};
            var pageWrap = angular.element('#pageWrap');
            lstNotificationService.clearNotification();
            $scope.trackAdaptiveAssignment = true;
            $scope.parentContentId = $routeParams.itemId;
            $scope.parentContentVersion = $routeParams.itemVersion;
            $scope.assignmentViewerHeaderVisible = false;
            $scope.assignmentViewerAssetsVisible = false;
            $scope.showSidePanel = $routeParams.rubric ? true : false;
            $scope.isNativeRealizeReaderEnabled = $window.realizeReaderEnabled;
            $scope.isSaveButtonVisible = false;
            $scope.isHideExitAndBackButton = false;
            $scope.showDocViewer = $routeParams.loadPdfjs ? $routeParams.loadPdfjs === 'true' : false;
            $scope.isContentCloseEventSent = false;
            $scope.isViewProgressPage = false;
            $scope.isStartTrackingEventSent = false;
            $scope.isAdaptiveAssignment = false;
            $scope.isMultiStage = $routeParams.isMultiStage ? $routeParams.isMultiStage === 'true' : false;
            $scope.multiStageTotalQuestionsCount =
                $routeParams.multiStageTotalQuestionsCount ? parseInt($routeParams.multiStageTotalQuestionsCount) : 0;
            $scope.multiStageBlockType = $routeParams.multiStageBlockType || null;
            $scope.isAdaptiveLessonAssignmentSubmitted = false;
            $scope.submitAnswerDestructor = undefined;
            $scope.isAssessmentMaintenancePageEnabled = false;

            var deferredAssignmentCompletion = $q.defer();
            var RRS_EVENTS = {
                exit: 'exit',
                turnIn: 'turnIn',
                tabSwitch: 'tabSwitch',
            };
            var PENPAL_EVENT = {
                TURNED_IN: 'TURNEDIN',
                MARK_COMPLETE: 'MARKCOMPLETE',
                CLOSE: 'CLOSE',
                SAVE: 'SAVE',
                SUBMIT_ANSWER: 'SUBMITANSWER',
                ASSIGNMENT_SUBMITTED: 'ASSIGNMENTSUBMITTED',
                ASSIGNMENT_SUBMITTED_RESOLVED: 'ASSIGNMENTSUBMITTED_RESOLVED',
                LANGUAGE_SELECTED: 'LANGUAGESELECTED',
                MULTI_STAGE_BLOCK_COMPLETED: 'MULTISTAGEBLOCKCOMPLETED',
                LOAD_COMPLETE: 'LOADCOMPLETE',
                RELOAD_ASSESSMENT_SESSION: 'RELOADASSESSMENTSESSION',
            };

            var sendLoadCompleteEvent = function() {
                if ($scope.parentIFrame) {
                    $scope.parentIFrame.exec(PENPAL_EVENT.LOAD_COMPLETE).catch(function(error) {
                        $log.error('error sending post message LOADCOMPLETE to parent: ', error);
                    });
                }
            };

            $scope.$on('assessment-player.question.loadComplete', function() {
                sendLoadCompleteEvent();
            });

            var isAssignmentComplete = function() {
                return $scope.assignmentStatus === ASSIGNMENT_CONSTANTS.STATUS.COMPLETED ||
                    $scope.assignmentStatus === ASSIGNMENT_CONSTANTS.STATUS.SUBMITTED;
            };

            $scope.isEarlyLearnerStudent = function() {
                var elTheme = 'EarlyLearner';
                return $currentUser.isStudent &&
                    elTheme.indexOf($currentUser.getAttribute('profile.learningExperience')) > -1;
            };

            var isEarlyLearner = $scope.isEarlyLearnerStudent();

            var setAssignmentStatusFromAssignment = function() {
                if (assignmentViewerService.isAssignmentViewer() && $scope.lwcAssignment) {
                    var studentId = $location.search().studentId;
                    if (studentId && !_.isEmpty(studentId)) {
                        $scope.assignmentStatus = $scope.lwcAssignment.getAssignmentStatus(studentId);
                    } else {
                        var lwcAssignmentStatus = $scope.lwcAssignment.getAssignmentStatus();
                        if (lwcAssignmentStatus) {
                            $scope.assignmentStatus = lwcAssignmentStatus;
                        } else if ($location.search().status) {
                            $scope.assignmentStatus = $location.search().status;
                        }
                    }
                }
            };

            if (angular.isUndefined($currentUser.isPreviewingAssignment)) {
                $currentUser.isPreviewingAssignment = ContentViewer.getPreviewStatus($location.path());
            }
            $scope.isPreviewMode = $currentUser.isPreviewingAssignment;

            var setupRubricOverriddenScore = function(userAssignmentId) {
                var metadataObj = $scope.lwcAssignment.findItemMetadataByUserAssignmentId(userAssignmentId);
                $scope.rubricConfig.overriddenPercentageScore = AssignmentFacadeService.getScore(metadataObj);
            };

            $scope.$on('assessment-player.question.rubricGuid', function(evt, data) {
                $scope.rubricGuid = data.rubricGuid ? data.rubricGuid : undefined;
                $scope.questionId = data.questionId;
                $scope.showSidePanel = false;
                $scope.rubricConfig.isRubricInteractive = false;
                if ($scope.showRubricScoringWarningMessage() && !isIFramed() && !$scope.rubricPanelHeightCalculated) {
                    $scope.rubricPanelHeightCalculated = true;
                    var rubricPanelHeight = $scope.rubricPanelHeight.height;
                    var notificationBarHeight = 63;
                    // length of 'px' string
                    var pixelLength = 2;
                    // here we are getting rubric side panel height value '123' from '123px'
                    var rubricSidePanelHeight = rubricPanelHeight.substring(0, rubricPanelHeight.length - pixelLength);
                    $scope.rubricPanelHeight = {
                        height: rubricSidePanelHeight - notificationBarHeight + 'px'
                    };
                }
                if (angular.isDefined(data.manualScore)) {
                    $scope.rubricConfig.overriddenScore = data.manualScore;
                }
                $scope.rubricConfig.isScoreSent = data.isScoreSent;
                $scope.hasRubric();
            });

            $scope.$on('essayScorer.telemetry.event', function(event, data) {
                var productName, programTitle, viewType;
                if (assignmentViewerService.isAssignmentViewer()) {
                    viewType = 'Assignment Viewer';
                    productName = $scope.lwcAssignment.contentItem.programs[0];
                    programTitle = $scope.lwcAssignment.contentItem.title;
                } else {
                    viewType = 'Content Viewer';
                    productName = $scope.content.programs[0];
                    programTitle = $scope.content.title;
                }
                assignmentTelemetryService.sendEssayScorerTelemetryEvent(viewType,
                productName, data.name, data.subpage, programTitle);
            });

            var setupRubricOptionsForAssignmentViewer = function() {
                var rubricConfig = {};
                $scope.rubricConfig = rubricConfig;
                setAssignmentStatusFromAssignment();

                var programHierarchy = $scope.lwcAssignment.programHierarchy;
                rubricConfig.programTitle =
                    telemetryUtilitiesService.getProgramTitle(programHierarchy);

                setupScoreModeForSelectedAsset($scope.userAssignmentId);
                setupRubricOverriddenScore($scope.userAssignmentId);
            };

            var setupScoreModeForSelectedAsset = function(userAssignmentId) {
                var isScoreMode = !$scope.isPreviewMode && ($scope.lwcAssignment.isAssignmentPastDueDate() ||
                    isAssignmentComplete() || isSelectedAssetComplete(userAssignmentId));
                $scope.rubricConfig.isScoreMode = isScoreMode;
                $scope.rubricConfig.isRubricInteractive = $currentUser.isTeacher && isScoreMode;
            };

            var isSelectedAssetComplete = function(userAssignmentId) {
                var selectedAssetMetadata = $scope.lwcAssignment.findItemMetadataByUserAssignmentId(userAssignmentId);
                if (!selectedAssetMetadata) {
                    return false;
                }
                return selectedAssetMetadata.status === ASSIGNMENT_CONSTANTS.STATUS.SUBMITTED ||
                    selectedAssetMetadata.status === ASSIGNMENT_CONSTANTS.STATUS.COMPLETED;
            };

            var setupRubricOptionsForContentViewer = function() {
                var rubricConfig = {};
                $scope.rubricConfig = rubricConfig;

                AssignmentUtil.getProgramHierarchy($scope.content, $scope.content.id)
                    .then(function(programHierarchy) {
                        rubricConfig.programTitle = telemetryUtilitiesService.getProgramTitle(programHierarchy);
                    });

                rubricConfig.isScoreMode = false;
                rubricConfig.isRubricInteractive = false;
            };

            if (assignmentViewerService.isAssignmentViewer()) {
                $rootScope.hidePlatform = true;
                $scope.lwcAssignment = ContentViewerData.assignment;
                $scope.assignmentViewerAssetsVisible = assignmentViewerService.isLesson($scope.lwcAssignment) &&
                    !isEarlyLearner;
                if ($scope.lwcAssignment && !isEarlyLearner) {
                    setupRubricOptionsForAssignmentViewer();
                }
                if (featureManagementService.isAssignmentViewerEnabledForELStudents() && isEarlyLearner) {
                    $scope.assignmentViewerHeaderVisible = true;
                }
                if ($scope.lwcAssignment && Object.keys($scope.lwcAssignment).length > 0 && !isEarlyLearner) {
                    $scope.assignmentViewerHeaderVisible = true;
                }
            }

            /**
             * Fixes an issue where backgrounds persist between asset changes.
             * clears all classes from #pageWrap
             */
            var cleanUpPageWrap = function() {
                var pageWrap = $document[0].getElementById('pageWrap');
                // Remove all classes on pageWrap because styles should not persist between content
                if (pageWrap) {
                    angular.element(pageWrap).removeClass();
                }
            };

            var getTargetIFrame = function() {
                if ($scope.isRRSItem) {
                    return document.getElementById('rrsFrame');
                }
                if ($scope.content.fileType === CONTENT_CONSTANTS.FILE_TYPE.TIN_CAN_SCO) {
                    return document.querySelector('[name="tinCanScoPlayer"]');
                }
                return undefined;
            };

            var clearIFrame = function(assignmentExitType) {
                // Clearing iframe allows SCOs to save data
                if ($scope.isRRSItem || $scope.content.fileType === CONTENT_CONSTANTS.FILE_TYPE.TIN_CAN_SCO) {
                    var iframe = getTargetIFrame();
                    if (iframe && $scope.isRRSItem) {
                        // Refreshing the promise before sending exit signal so that Realize wait for RRS content reply
                        // RGHT-84484
                        deferredAssignmentCompletion = $q.defer();
                        // The type 'turnIn' will let RR know that the assignment is being turned in
                        // thereby Realize will wait for a confirmation response from RR ('rrUnloadComplete')
                        // Sending user assignment id for logging purposes in RR
                        var message = {
                            action: 'exitRRSIFrame',
                            data: {
                                type: assignmentExitType,
                                userAssignmentId: $scope.userAssignmentId,
                            }
                        };
                        // Log will be removed before merging to release
                        $log.debug('RR SCO :: From R: [RGHT-72208] : Sending post to RR');
                        sendPostMessage(message, iframe.contentWindow);
                    } else if (iframe && $scope.content.fileType === CONTENT_CONSTANTS.FILE_TYPE.TIN_CAN_SCO) {
                        iframe.src = '';
                    }
                }
            };

            $scope.onAssetSelectProxy = function(contentId, contentVersion, userAssignmentId) {
                var inAssignmentContext = assignmentViewerService.isAssignmentViewer();
                var isExternalPDFViewerEnabled = featureManagementService.isExternalPdfViewerEnabled();
                var isFileTypePDF = $scope.content.fileType === CONTENT_CONSTANTS.FILE_TYPE.PDF;
                // for clearing iframe for current asset
                var eventType = RRS_EVENTS.tabSwitch;
                clearIFrame(eventType);
                if ($scope.isRRSItem) {
                    // defer the asset switch (and current iFrame unload) till we receive a notification
                    // from RRS for the message posted [RGHT-72208]
                    $log.debug('RR SCO :: From R: [RGHT-72208] : Deferring Asset Switch');
                    deferredAssignmentCompletion
                        .promise
                        .then(function() {
                            $log.debug('promise resolved for asset select');
                            $scope.onAssetSelect(contentId, contentVersion, userAssignmentId);
                        });
                    return deferredAssignmentCompletion;
                }
                if (inAssignmentContext && isExternalPDFViewerEnabled && isFileTypePDF) {
                    return pdfViewerCloseEvent()
                    .then(function() {
                        $log.log('onAssetSelectProxy pdfViewerCloseEvent resolved');
                        $scope.onAssetSelect(contentId, contentVersion, userAssignmentId);
                    })
                    .catch(function() {
                        $scope.onAssetSelect(contentId, contentVersion, userAssignmentId);
                    });
                }
                $scope.onAssetSelect(contentId, contentVersion, userAssignmentId);
                return $q.when();
            };

            $scope.onAssetSelect = function(contentId, contentVersion, userAssignmentId, preventContentViewerSetup) {
                $scope.isLanguageSelectOptionEnabled = false;
                $scope.showSidePanel = false;
                $scope.assetContentId = null;
                $scope.assetContentVersion = null;
                $scope.multiLangMetadataObj = null;
                if ($scope.lwcAssignment.allowMultipleLanguage) {
                    angular.forEach($scope.lwcAssignment.studentMetadata, function(metadataObj) {
                        if (metadataObj.userAssignmentId === userAssignmentId &&
                            metadataObj.userAssignmentLanguageList.length > 1 &&
                                metadataObj.status === 'not_started') {
                            AssignmentFacadeService.getLWCAssignment($routeParams.classId, $routeParams.assignmentId)
                            .then(function(response) {
                                $scope.customAssignment = response;
                            });
                            if (angular.isUndefined($scope.customAssignment)) {
                                $scope.customAssignment = $scope.lwcAssignment;
                            }

                            $scope.studentDataObject = $scope.customAssignment.studentMetadata.filter(
                                function(studentData) {
                                return studentData.userAssignmentId === userAssignmentId;
                            });
                            if (!angular.isUndefined($scope.studentDataObject) && $scope.studentDataObject.length > 0 &&
                               $scope.studentDataObject[0].status === 'not_started') {
                                $scope.isLanguageSelectOptionEnabled = true;
                                $scope.assetContentId = contentId;
                                $scope.assetContentVersion = contentVersion;
                                $scope.multiLangMetadataObj = metadataObj;
                            }
                        }
                    });
                }

                if (preventContentViewerSetup) {
                    return;
                }

                setupRubricOverriddenScore(userAssignmentId);
                setupScoreModeForSelectedAsset(userAssignmentId);
                if (!$scope.isLanguageSelectOptionEnabled) {
                    $scope.onSelectAVAsset(contentId, contentVersion, userAssignmentId);
                }
            };

            $scope.onSubmitLanguageChange = function(userAssignmentId, itemUuid) {
                if (isIFramed() && $scope.parentIFrame) {
                    var payload = { userAssignmentId: userAssignmentId, itemUuid: itemUuid };
                    $scope.parentIFrame.exec(PENPAL_EVENT.LANGUAGE_SELECTED, payload)
                        .catch(function(error) {
                            $log.error('error sending LANGUAGESELECTED event to parent: ', error);
                        });
                }
                var updateLanguageSelect = function() {
                    $scope.metadataObject = $scope.lwcAssignment.studentMetadata.filter(function(studentData) {
                        return studentData.userAssignmentId === userAssignmentId;
                    });

                    angular.forEach($scope.metadataObject[0].userAssignmentLanguageList, function(language) {
                        language.isSelected = language.itemUuid === itemUuid;
                        if (language.isSelected) {
                            $scope.metadataObject[0].status = 'in_progress';
                        }
                    });
                };

                if ($currentUser.isPreviewingAssignment) {
                    updateLanguageSelect();
                    $scope.onSelectAVAsset(itemUuid, $scope.assetContentVersion, userAssignmentId);
                } else {
                    AssignmentFacadeService.updateLanguagePreference(userAssignmentId, itemUuid)
                        .then(function() {
                            updateLanguageSelect();
                            $scope.onSelectAVAsset(itemUuid, $scope.assetContentVersion, userAssignmentId);
                        }, function(err) {
                            $log.error('Failed to update language preference', err);
                        });
                }
            };
            // TODO add spec

            $scope.onSelectAVAsset = function(contentId, contentVersion, userAssignmentId) {
                if (!$scope.isContentCloseEventSent) {
                    $scope.stopTrackingTimeSpent();
                }
                $scope.isAdaptive = false;
                $scope.isAdaptiveAssignment = false;
                $scope.showProgress = false;
                if (!featureManagementService.isExternalPdfViewerFebEnabled()) {
                    $scope.showDocViewer = false;
                }
                $scope.showSummary = false;
                $scope.isReady = false;
                $scope.isAdaptiveLessonLevelAssignment = false;
                if (!contentId || !contentVersion || !userAssignmentId) {
                    throw new Error('Required params missing for switching Assignment Viewer tab');
                }
                ContentResolver(contentId, contentVersion)
                    .then(function(content) {
                        cleanUpPageWrap();
                        $scope.userAssignmentId = userAssignmentId;
                        $scope.isStartTrackingEventSent = true;
                        // Updating stopTrackingTimeSpent function while switching between asset tabs
                        $scope.stopTrackingTimeSpent = null;
                        $scope.setupContentViewer(content);
                        if (content.mediaType === MEDIA_TYPE.ADAPTIVE_HOMEWORK) {
                            ContentViewerData = $scope.getContentViewerDataFromContent(ContentViewerData, content);
                            $scope.parentContentId = content.id;
                            $scope.parentContentVersion = content.version;
                            $scope.parentUserAssignmentId = userAssignmentId;
                            $scope.isAdaptiveAssignment = true;
                        }
                        // Avoiding duplicate start tracking event for adaptive assignments while switching between tabs
                        if (content.mediaType !== MEDIA_TYPE.ADAPTIVE_HOMEWORK) {
                            $scope.startTrackingTimeSpent();
                        }
                    });
            };

            $scope.getContentViewerDataFromContent = function(existingContentViewerData, newContent) {
                if (!newContent.ClassRoster) {
                    newContent.ClassRoster = existingContentViewerData.ClassRoster;
                }
                if (!newContent.assignment) {
                    newContent.assignment = existingContentViewerData.assignment;
                }
                if (!newContent.displayThumbnail) {
                    newContent.displayThumbnail = existingContentViewerData.displayThumbnail;
                }
                if (!newContent.isGoogleClassroomEnabled) {
                    newContent.isGoogleClassroomEnabled = existingContentViewerData.isGoogleClassroomEnabled;
                }
                return newContent;
            };

            $scope.shouldIncludeFooterElement = function() {
                return $scope.isRecommendation || $scope.isReady;
            };
            $scope.shouldHideFooter = function() {
                return (
                    $scope.showProgress ||
                    ($scope.showSummary && $scope.isAdaptiveAssignmentCompleted()) ||
                    isIFramedAdaptiveContext()
                );
            };
            $scope.isAdaptiveAssignmentCompleted = function() {
                if (
                    $scope.content.mediaType === MEDIA_TYPE.ADAPTIVE_HOMEWORK &&
                    !$currentUser.isPreviewingAssignment &&
                    $scope.lwcAssignment.isLesson()
                ) {
                    var studentId = $location.search().studentId;
                    return 'completed' === $scope.lwcAssignment.getChildAdaptiveUserAssignment(studentId).status;
                }
                return !$scope.isReady;
            };
            $scope.isAssignmentViewerLesson = function() {
                return $scope.assignmentViewerHeaderVisible && $scope.lwcAssignment.isLesson();
            };
            $scope.setupContentViewer = function(ContentViewerData, isCalledFirstTime) {
                $scope.showLoading = true;
                $scope.showSplash = false;
                $scope.showPageNavigation = false;
                $scope.isRRSItem = false;
                $scope.showContentViewerBanner = false;
                $scope.rubricGuid = undefined;
                lstNotificationService.clearNotification();

                $scope.hasRubric = function() {
                    if ($scope.isEarlyLearnerStudent()) {
                        return false;
                    }

                    $scope.rubricConfig.rubricGuid = $scope.content.rubricGuid ? $scope.content.rubricGuid
                        : $scope.rubricGuid;

                    var isRubricQuestionOrContent = $scope.content.rubricAvailable &&
                        $scope.rubricConfig.rubricGuid !== undefined;

                    if (assignmentViewerService.isAssignmentViewer()) {
                        if (!$scope.lwcAssignment) {
                            return false;
                        }
                        return $scope.lwcAssignment.useRubric && isRubricQuestionOrContent;
                    }
                    return isRubricQuestionOrContent;
                };

                $scope.onRubricSelect = function() {
                    return true;
                };

                // Wait for spinner to go away, then update header style
                var unwatchViewLoading = $scope.$watch('viewLoading', function(newValue) {
                    if (!newValue) {
                        // Add delay due to waiting for all subcomponents to fully render
                        var CONTENT_STYLE_UPDATE_DELAY = 1000;
                        $timeout(function() {
                            updateContentViewerStyle();
                            if ($scope.content.fileType === CONTENT_CONSTANTS.FILE_TYPE.PDF ||
                                $scope.content.fileType === CONTENT_CONSTANTS.FILE_TYPE.SCO ||
                                $scope.content.fileType === CONTENT_CONSTANTS.FILE_TYPE.TIN_CAN_SCO) {
                                sendLoadCompleteEvent();
                            }
                            unwatchViewLoading();
                        }, CONTENT_STYLE_UPDATE_DELAY);
                    }
                });

                var updateContentViewerStyle = function() {
                    $scope.$evalAsync(function() {
                        var isFooterElementVisible = function() {
                            return $scope.shouldIncludeFooterElement() && !$scope.shouldHideFooter();
                        };
                        var getHeaderHeight = function() {
                            var cvHeaderHeight = 40;
                            return $scope.assignmentViewerHeaderVisible ? getAvHeaderHeight() : cvHeaderHeight;
                        };
                        var getAvHeaderHeight = function() {
                            return headerElement ? headerElement.offsetHeight : 0;
                        };
                        var getFooterHeight = function() {
                            var footerHeight = 60;
                            return isFooterElementVisible() ? footerHeight : 0;
                        };
                        var pxIfy = function(pixels) {
                            return pixels + 'px';
                        };
                        var headerElement = getFixedTopElement();
                        $scope.headerHeight = getHeaderHeight();
                        $scope.contentHeight = $window.innerHeight - $scope.headerHeight - getFooterHeight();
                        var containerHeight = pxIfy($scope.contentHeight);
                        var rubricSidePanelHeight = $scope.content.mediaType === 'Test' && !BrowserInfo.isIDevice ?
                            pxIfy($scope.contentHeight - 60) : containerHeight;
                        $scope.loaderStyle = {
                            height: pxIfy($window.innerHeight - 120)
                        };

                        $scope.rrsContainerStyle = {
                            height: containerHeight,
                            width: '100%',
                        };

                        $scope.rubricPanelHeight = {
                            height: rubricSidePanelHeight
                        };

                    });
                };

                $window.addEventListener('resize', _.throttle(updateContentViewerStyle, 100));
                $scope.$on('$destroy', function() {
                    $window.removeEventListener('resize', updateContentViewerStyle);
                    angular.element('html').removeClass('contentViewer');
                });

                ContentViewer.setupController($scope, ContentViewerData);

                var fileType = $scope.content.fileType;
                var mediaType = $scope.content.mediaType;
                var isLevelReaderURL = mediaType === MEDIA_TYPE.LEVELED_READER &&
                    fileType === CONTENT_CONSTANTS.FILE_TYPE.URL;
                var isMediaTypeGoogleDoc = mediaType === MEDIA_TYPE.GOOGLE_DOC;
                var isContentDownloadable = $filter('contains')($scope.content.restrictedDownloadContent, 'download');
                var supportedFiletypeForMobileDownload = ['PDF', 'DOC', 'PPT', 'Doc/Docx', 'PPT/PPTX', 'DOCX', 'PPTX'];
                var enableMobileDownload = BrowserInfo.OS.isIOS &&
                        _.contains(supportedFiletypeForMobileDownload, fileType);
                $scope.enableDownload = function() {
                    var shouldEnableDownload =  isContentDownloadable &&
                        (!BrowserInfo.OS.isIOS || enableMobileDownload) && !isMediaTypeGoogleDoc;
                    var inAssignmentContext = assignmentViewerService.isAssignmentViewer();
                    var isExternalPDFViewerEnabled = featureManagementService.isExternalPdfViewerEnabled();
                    var isExternalPdfViewerFebEnabled = featureManagementService.isExternalPdfViewerFebEnabled();
                    var isFileTypePDF = $scope.content.fileType === CONTENT_CONSTANTS.FILE_TYPE.PDF;
                    var isPDFDownloadOnly = $filter('contains')($scope.content.restrictedDownloadContent,
                        'Download Only');

                    if (!isPDFDownloadOnly && inAssignmentContext && isFileTypePDF && isExternalPDFViewerEnabled) {
                        shouldEnableDownload = false;
                    }
                    if (!isPDFDownloadOnly && isFileTypePDF && isExternalPdfViewerFebEnabled) {
                        shouldEnableDownload = false;
                    }
                    if ($scope.isUploadedContentPdf()) {
                        shouldEnableDownload = false;
                    }
                    return shouldEnableDownload;
                };

                $scope.docViewerUrl = ContentViewer.setDocViewerUrl($scope, $scope.content);
                $scope.isAdaptiveAssignment = (mediaType === MEDIA_TYPE.ADAPTIVE_HOMEWORK);

                $scope.downloadLinkLabel = function() {
                    if (!MediaQuery.breakpoint.isDesktop) {
                        return '';
                    } else {
                        return (enableMobileDownload) ? lwcI18nFilter('contentViewer.action.open') :
                            lwcI18nFilter('contentViewer.action.download');
                    }
                };

                $scope.showSiblings = function() {
                    return $scope.content.siblings && !$scope.isStudent && !$scope.isEditing;
                };

                $scope.isContentUrlInvalid = !$scope.content.url || $scope.content.url === null;

                $scope.googleDocUrl = getGoogleDocURL();

                $scope.getIsContentUrlInvalid = function() {
                    return mediaType === MEDIA_TYPE.GOOGLE_DOC ?
                        (!$scope.googleDocUrl || $scope.isContentUrlInvalid) : $scope.isContentUrlInvalid;
                };

                $scope.isContentUrlRequired = mediaType !== MEDIA_TYPE.TEST &&
                    mediaType !== MEDIA_TYPE.ADAPTIVE_HOMEWORK &&
                    mediaType !== MEDIA_TYPE.DIAGNOSTIC_ASSESSMENT;

                $scope.isAssessment = mediaType === MEDIA_TYPE.TEST;

                $scope.isScoOrTest = mediaType === MEDIA_TYPE.TEST ||
                    fileType === CONTENT_CONSTANTS.FILE_TYPE.TEST ||
                    fileType === CONTENT_CONSTANTS.FILE_TYPE.SCO ||
                    fileType === CONTENT_CONSTANTS.FILE_TYPE.TIN_CAN_SCO;

                $scope.hasEssayScorer = $scope.content.hasEssayScoring;

                $scope.isReviewMode = ($scope.currentUser.isLtiAUser && $scope.hasEssayScorer) ?
                        'isReviewMode' : $scope.content.isReviewMode;

                $scope.isRecommendation = $scope.isAdaptive && mediaType !== MEDIA_TYPE.ADAPTIVE_HOMEWORK;

                $scope.showSidePanel = $routeParams.rubric && mediaType !== MEDIA_TYPE.TEST;

                if (mediaType === MEDIA_TYPE.AUDIO || mediaType === MEDIA_TYPE.VIDEO) {

                    //make sure we are on ipad and we have the urls we need to construct the right ipad url
                    if (BrowserInfo.isIDevice && $scope.content.ipadUrl && $scope.content.ipadTokenRetrievalUrl) {
                        $scope.contentUrl = $scope.content.ipadUrl;
                    } else {
                        $scope.contentUrl = $scope.content.url;
                    }
                }

                // Determine the file name
                if ($scope.content.hasOwnProperty('file') && $scope.content.file === '') {
                    $scope.fileName = $scope.content.file;
                } else if ($scope.content.attachments && $scope.content.attachments.length) {
                    $scope.fileName = $scope.content.attachments[0].file;
                } else {
                    $scope.fileName = '';
                }

                $scope.clearMediaClass = function() {
                    if ($scope.content.mediaClass) {
                        pageWrap.removeClass($scope.content.mediaClass);
                    }
                };

                if (($scope.isAdaptiveAssignment || $scope.isAssessment) &&
                    featureManagementService.isAssessmentMaintenancePageEnabled()) {
                    $scope.isAssessmentMaintenancePageEnabled = true;
                    $rootScope.viewLoading = false;
                    $scope.showLoading = false;
                    return;
                }

                $scope.pickMediaClass = function() {
                    $scope.clearMediaClass();
                    if (!$scope.content || !mediaType) {
                        $scope.content.mediaClass = '';
                        return;
                    }
                    // Only times to apply the style on #pageWrap for default background image
                    if (mediaType === MEDIA_TYPE.REALIZE_READER_SELECTION ||
                        mediaType === MEDIA_TYPE.ETEXT ||
                        mediaType === MEDIA_TYPE.INTERACTIVE_MEDIA ||
                        mediaType === MEDIA_TYPE.SELECTED_READING ||
                        (mediaType === MEDIA_TYPE.LINK &&
                            fileType !== CONTENT_CONSTANTS.FILE_TYPE.OPEN_ED) ||
                        isLevelReaderURL) {
                        $scope.content.mediaClass = 'mediaType-' +
                            $scope.content.mediaType.toLowerCase().replace(/\s/g, '-');
                        pageWrap.addClass($scope.content.mediaClass);
                    }
                };

                var isInstructionalTrackingRecommendation = function() {
                    return $scope.isRecommendation && $scope.isTrackingRecommendation;
                };

                $scope.$on('$routeChangeStart', $scope.clearMediaClass);
                $scope.$watch('content.mediaType', $scope.pickMediaClass);
                $scope.pickMediaClass();

                // Set pageWrap mediaType class?
                $scope.clearMediaClass();
                if (mediaType === MEDIA_TYPE.REALIZE_READER_SELECTION ||
                    mediaType === MEDIA_TYPE.SELECTED_READING ||
                    mediaType === MEDIA_TYPE.ETEXT ||
                    mediaType === MEDIA_TYPE.LINK ||
                    mediaType === MEDIA_TYPE.INTERACTIVE_MEDIA ||
                    isLevelReaderURL) {
                    $scope.pickMediaClass();
                }

                // $scope.content.displayThumbnail assignment
                if (mediaType === MEDIA_TYPE.REALIZE_READER_SELECTION ||
                    mediaType === MEDIA_TYPE.SELECTED_READING ||
                    mediaType === MEDIA_TYPE.ETEXT ||
                    isLevelReaderURL) {
                    $scope.content.displayThumbnail = $scope.content.$getThumbnailUrl('ETEXT', false);
                } else {
                    $scope.content.displayThumbnail = '';
                }

                // Determine the file size
                if ($scope.content.hasOwnProperty('size') && $scope.content.size === '') {
                    $scope.fileSize = $scope.content.size;
                } else if ($scope.content.attachments && $scope.content.attachments.length) {
                    $scope.fileSize = $scope.content.attachments[0].size;
                } else {
                    $scope.fileSize = '';
                }

                //LTI Launch Content
                if (mediaType === MEDIA_TYPE.PARTNER_LINK) {
                    $scope.content.isNewWindowLtiLaunch = $scope.content.ltiLaunchSettings.openNewWindow ||
                        ($location.protocol() === 'https' && $scope.content.url.indexOf('https') === -1);
                    $scope.content.displayThumbnail = $scope.content.$getThumbnailUrl('PARTNER_LINK', false);
                }

                //Adaptive Assignment
                if (mediaType === MEDIA_TYPE.ADAPTIVE_HOMEWORK && !$currentUser.isPreviewingAssignment) {
                    $scope.adaptiveAssignmentState = {};
                    $scope.isAdaptive = true;
                    if (!$scope.lwcAssignment.isLesson()) {
                        AssignmentFacadeService.getLWCAssignment($routeParams.classId, $routeParams.assignmentId)
                            .then(function(response) {
                                $log.log('Retrieved assignment', response);
                                $scope.lwcAssignment = response;
                                $scope.assignmentStatus = $scope.lwcAssignment
                                .getAssignmentStatus($location.search().studentId);
                                $scope.viewReport();
                            }, function(error) {
                                $log.log('Retrieving lwcAssignment failed', error);
                                $scope.back();
                            });
                    } else {
                        $scope.isAdaptiveLessonLevelAssignment = true;
                        var studentId = $location.search().studentId;
                        $scope.assignmentStatus = $scope.lwcAssignment.getChildAdaptiveUserAssignment(studentId).status;
                        $scope.viewReport();
                    }
                }

                var showEssayScorerInlineMessage = function() {
                    var notificationMsg = lwcI18nFilter('contentViewer.status.assignmentCompleted');
                    var notificationType = 'success';

                    lstNotificationService.addNotification(notificationType, notificationMsg,
                        'true', '3000', angular.element('.content-navbar').height());
                };

                $scope.windowReload = function() {
                    $window.location.reload();
                };

                $scope.$on('assessment-player.multi-stage.block-completed', function() {
                    if ($scope.parentIFrame) {
                        $scope.parentIFrame.exec(PENPAL_EVENT.MULTI_STAGE_BLOCK_COMPLETED)
                            .catch(function(error) {
                                $log.error('error sending MULTISTAGEBLOCKCOMPLETED event to parent: ', error);
                            });
                    }
                });

                $scope.$on('assessment-player.assessment.submitted', function() {
                    if (isIFramed() && $scope.parentIFrame) {
                        var payload = { hasEssayScorer: $scope.hasEssayScorer };
                        $scope.parentIFrame.exec(PENPAL_EVENT.ASSIGNMENT_SUBMITTED, payload)
                            .catch(function(error) {
                                $log.error('error sending ASSIGNMENTSUBMITTED event to parent: ', error);
                            });
                    }
                });

                $scope.$on('assessment-player.hasEssayScorer.exit', function(event, clickEvent) {
                    if (isIFramed() && $scope.currentUser.isLtiAUser && $scope.parentIFrame) {
                        var payload = { hasEssayScorer: $scope.hasEssayScorer };
                        $scope.parentIFrame.exec(PENPAL_EVENT.ASSIGNMENT_SUBMITTED, payload)
                            .then(function() {
                                $scope.windowReload(); // triggers contentResolver flow
                            })
                            .catch(function(error) {
                                $log.error('error sending ASSIGNMENTSUBMITTED event to parent: ', error);
                            });
                    } else if (isIFramed() && $scope.parentIFrame) {
                        var data = { hasEssayScorer: $scope.hasEssayScorer };
                        $scope.sendStopTrackingEvent()
                        .then(function() {
                            $log.log('Calling STOP tracking event from EssayScorer Submit function.');
                            $scope.parentIFrame.exec(PENPAL_EVENT.ASSIGNMENT_SUBMITTED, data)
                            .catch(function(error) {
                                $log.error('error sending ASSIGNMENTSUBMITTED event to parent: ', error);
                            });
                        });
                    } else if ($scope.currentUser.isLtiAUser) {
                        showEssayScorerInlineMessage();
                        $scope.windowReload(); // triggers contentResolver flow
                    } else {
                        $scope.back(clickEvent);
                    }
                });

                if ($scope.isRecommendation && $scope.isAssessment && !$scope.isReview) {

                    if ($scope.enableContinueButtonToggle || isIFramedAdaptiveContext()) {
                        $log.log('Enabling continue button toggle for Assessment Recommendation');

                        $scope.$on('assessment-player.player-directive.questionStatusChanged', function(event, data) {
                            if (!event.defaultPrevented) {
                                event.preventDefault();
                                $scope.$evalAsync(function() {
                                    $log.log('questionStatusChanged in content ctrl : ', data.questionStatus);
                                    $scope.questionCompleted = data.questionStatus === 'Completed';
                                    $scope.disableContinueButton = !$scope.questionCompleted;
                                    if (isIFramedAdaptiveContext() && $scope.parentIFrame) {
                                        var payload = { isReadyForSubmit: $scope.questionCompleted };
                                        $scope.parentIFrame.exec('READYFORSUBMIT', payload).catch(function(error) {
                                            $log.error('error sending post message READYFORSUBMIT to parent: ', error);
                                        });
                                    } else {
                                        $log.error('Parent IFrame connection is not available.');
                                    }
                                });
                            }
                        });
                        $scope.questionCompleted = false;
                        $scope.disableContinueButton = true;
                    }

                    $scope.$on('assessment-player.player-directive.assessmentSubmitted', function(event, data) {
                        if (!event.defaultPrevented) {
                            event.preventDefault();
                            $scope.$evalAsync(function() {
                                $log.log('assessmentSubmitted in content ctrl : ', data);
                                $scope.assessmentSubmitted = data.assessmentSubmitted;
                                $scope.disableContinueButton = $scope.enableContinueButtonToggle &&
                                    !data.assessmentSubmitted && !$scope.questionCompleted;
                            });
                        }
                    });
                    $scope.assessmentSubmitted = false;
                } else if (!$scope.isRecommendation) {
                    $scope.disableContinueButton = true;
                } else {
                    $scope.disableContinueButton = false;
                }

                // todo: phase out and/or handle direct /content/id... paths, right now none should exist
                $scope.showBack = true;

                if (!$scope.stopTrackingTimeSpent) {
                    if ($scope.isAdaptive || mediaType === MEDIA_TYPE.ADAPTIVE_HOMEWORK) {
                        $scope.stopTrackingTimeSpent = function() {
                            if (!isIFramed() && !isInstructionalTrackingRecommendation() &&
                                $scope.content.mediaType !== MEDIA_TYPE.ADAPTIVE_HOMEWORK && !$scope.showSummary) {
                                $log.log('Calling STOPS tracking from content ctrl for non adaptive content');
                                contentViewerActionTracking(
                                    $scope.content.id,
                                    $scope.content.version,
                                    $scope.userAssignmentId,
                                    CONTENT_CONSTANTS.CONTENT_VIEWER_ACTIVITY.STOPS);
                            }
                            if (isInstructionalTrackingRecommendation() && !$scope.trackAdaptiveAssignment) {
                                $log.log('Calling stopTrackingCurrentRecommendation from stopTrackingTimeSpent');
                                $scope.stopTrackingCurrentRecommendation();
                            }
                            //to stop the stopTracking call on exit/back button click for adaptive assignment
                            if (!$scope.trackAdaptiveAssignment) {
                                $scope.isRecommendation = false;
                                $scope.trackAdaptiveAssignment = true;
                                $log.log('Calling STOP tracking event from stopTrackingTimeSpent');
                                contentViewerActionTracking(
                                    $scope.parentContentId,
                                    $scope.parentContentVersion,
                                    $scope.parentUserAssignmentId,
                                    CONTENT_CONSTANTS.CONTENT_VIEWER_ACTIVITY.STOPS);
                            }
                        };
                    } else {
                        if (!isIFramed()) {
                            $scope.stopTrackingTimeSpent = function() {
                                $log.log('Calling tracking STOPS from content ctrl');
                                contentViewerActionTracking(
                                    $scope.content.id,
                                    $scope.content.version,
                                    $scope.userAssignmentId,
                                    CONTENT_CONSTANTS.CONTENT_VIEWER_ACTIVITY.STOPS);
                            };
                        }
                        // To avoid duplicate start tracking call while switching between asset tabs
                        if (!$scope.isStartTrackingEventSent) {
                            $scope.startTrackingTimeSpent();
                        }
                    }

                    /*
                    In a multi-asset view, when exiting from player-directive (going to a viewer other than assessment
                     viewer) old session id persists and is added to the current scope when a new assessment is opened,
                    which leads to multiple calls with current session id and the old session id which was from the
                    previous assessment. So clearing the sessionId while exiting from a player-directive
                    */
                    $scope.$on('assessment-player.player-directive.clear-session-id', function() {
                        $scope.sessionId = '';
                    });

                    $scope.$on('$destroy', function() {
                        $window.onbeforeunload = null;
                    });
                }

                if (!$scope.isEarlyLearnerStudent() && isCalledFirstTime) {
                    $scope.$on('$locationChangeStart', $scope.stopTrackingTimeSpent);
                    $window.onbeforeunload = function() {
                        $scope.$evalAsync($scope.stopTrackingTimeSpent);
                    };
                }

                // updates assignment status
                if ($scope.isLanguageSelectOptionEnabled) {
                    $scope.isLanguageSelectOptionEnabled = false;
                    AssignmentFacadeService.setInProgress($scope.userAssignmentId, $scope.isAdaptive,
                        $routeParams.classId, $routeParams.assignmentId)
                        .then(function(response) {
                            $log.debug('Marking assignment to in progress', response);
                        }, function(err) {
                            $log.error('Failed to update assignment status', err);
                        });
                }

                if (mediaType !== MEDIA_TYPE.ADAPTIVE_HOMEWORK) {
                    $scope.assignmentStatus = 'in_progress';
                    $scope.disableReportButton = false;
                    $rootScope.viewLoading = false;
                    $scope.showLoading = false;
                }

                if (mediaType === MEDIA_TYPE.ADAPTIVE_HOMEWORK && $currentUser.isPreviewingAssignment) {
                    $scope.disableReportButton = false;
                    $rootScope.viewLoading = false;
                    $scope.showLoading = false;
                    $scope.enableAdaptiveHomework = true;
                }

                if (mediaType === MEDIA_TYPE.REALIZE_READER_SELECTION) {
                    $scope.isRRSItem = true;
                    $scope.rrsConfig = {};
                    $scope.rrsConfig.url = ContentViewer.getRRSUrl($scope.content);
                    // Both Legacy CV and LTI-Legacy are reading hostUrl from same config,
                    // Necessity is to use different URL for both use cases.
                    var rrsUrl = new URL($scope.rrsConfig.url);
                    if (rrsUrl && rrsUrl.host) {
                        var rrsSubdomians = rrsUrl.host.split('.');
                        // Hard coding to reader-rrs as this is the only sub-domain which is supported within Legacy CV
                        rrsSubdomians[0] = 'reader-rrs';
                        rrsUrl.host = rrsSubdomians.join('.');

                        $scope.rrsConfig.url = rrsUrl.href;
                    }
                    $scope.rrsConfig.trustedUrl = $sce.trustAsResourceUrl($scope.rrsConfig.url);
                    setAssignmentStatusFromAssignment();
                }

                if (mediaType === MEDIA_TYPE.LEARNING_RESOURCE) {
                    $scope.learningResourceConfig = {};
                    var ltiLaunchUrl = $scope.content.launchUrl + '&locale=' + $scope.currentUser.getLocale();
                    $scope.learningResourceConfig.trustedUrl = $sce.trustAsResourceUrl(ltiLaunchUrl);
                }

                if (mediaType === MEDIA_TYPE.GOOGLE_DOC) {
                    $scope.googleDocConfig = {};
                    $scope.googleDocConfig.trustedUrl = $sce.trustAsResourceUrl($scope.googleDocUrl);
                }

                // check for enabling multilang options for assignment
                var languageSelected = $location.search().languageSelected;
                if (assignmentViewerService.isAssignmentViewer() && isIFramed() &&
                        $scope.assignmentViewerAssetsVisible && !languageSelected &&
                        $scope.lwcAssignment.contentItem) {

                    var contentId = $routeParams.itemId;
                    var contentVersion = $routeParams.itemVersion;
                    var userAssignmentId = $scope.userAssignmentId;
                    if ($scope.currentUser.isTeacher) {
                        var itemMetadata = $scope.lwcAssignment
                            .findItemMetadata(contentId, $location.search().studentId);
                        userAssignmentId = itemMetadata.userAssignmentId;
                    }

                    var preventContentViewerSetup = true;
                    $scope.isContentCloseEventSent = true;
                    $scope.onAssetSelect(contentId, contentVersion, userAssignmentId, preventContentViewerSetup);
                }

                // This assignmentCompletedAlertHelperService is used to determine if the assignment is marked complete
                // During turn-in process, a message is sent to RR for saving scos and same thing is done during back()
                // Since during turn-in both are invoked, this is used to short-curcuit the message during back()
                // this is done to prevent realize waiting twice for saving the same scos which may result in errors
                assignmentCompletedAlertHelperService.setAssignmentCompleted(false);
                initializeContentViewerBannerProperties();
                $scope.shouldDisplaySaveButton();
                shouldDisplayExitAndBackButton();
            };

            $scope.sendStopTrackingEvent = function() {
                // Not sending stop tracking event for adaptive assignmenment when there is no start tracking event
                if ($scope.isAdaptiveAssignment && $scope.trackAdaptiveAssignment) {
                    return;
                }
                var contentId = $scope.content.id;
                var contentVersion = $scope.content.version;
                var userAssignmentId = $scope.userAssignmentId;
                // Sending stop tracking event for adaptive assignment from viewProgress or showSummary page
                if ($scope.isAdaptive && ($scope.isViewProgressPage || $scope.showSummary)) {
                    contentId = $scope.parentContentId;
                    contentVersion = $scope.parentContentVersion;
                    userAssignmentId = $scope.parentUserAssignmentId;
                    $log.log('Calling STOP tracking event for adaptive content from viewProgress or showSummary page');
                }
                return contentViewerActionTracking(
                    contentId,
                    contentVersion,
                    userAssignmentId,
                    CONTENT_CONSTANTS.CONTENT_VIEWER_ACTIVITY.STOPS)
                .then(function() {
                    $scope.trackAdaptiveAssignment = true;
                    $log.log('Calling STOP tracking event from sendStopTrackingEvent');
                    // Sending stop tracking event for adaptive Recommendation
                    if ($scope.isRecommendation && $scope.isTrackingRecommendation) {
                        $scope.isRecommendation = false;
                        $scope.isTrackingRecommendation = false;
                        $log.log('Calling STOP tracking isRecommendation event from sendStopTrackingEvent');
                        return contentViewerActionTracking(
                            $scope.parentContentId,
                            $scope.parentContentVersion,
                            $scope.parentUserAssignmentId,
                            CONTENT_CONSTANTS.CONTENT_VIEWER_ACTIVITY.STOPS);
                    }
                    return;
                })
                .catch(function(error) {
                    $log.log('Error while sending STOP tracking event:', error);
                    return;
                });
            };

            $scope.sendRubricsScore = function(rubricSessionData) {
                if (isIFramed() && $scope.parentIFrame) {
                    $scope.parentIFrame.exec('SENDSCORE', rubricSessionData)
                        .catch(function(error) {
                            $log.error('error sending post message SENDSCORE to parent: ', error);
                        });
                }
            };

            $scope.shouldDisplaySaveButton = function() {
                $scope.isSaveButtonVisible = $scope.isLtiaResourceRRSLaunch();
            };

            var shouldDisplayExitAndBackButton = function() {
                var isLtiaResourceLaunch = !!$location.search().isLtiaResourceLaunch;
                var isLtiAUser = $scope.currentUser.isLtiAUser;
                var isRealizeLaunchAllowed = !!$location.search().allowRealizeLaunch;
                if ((isLtiaResourceLaunch && isLtiAUser) || isRealizeLaunchAllowed) {
                    $scope.isHideExitAndBackButton = true;
                }
            };

            $scope.isLtiaResourceRRSLaunch = function() {
                var isLtiaResourceLaunch = !!$location.search().isLtiaResourceLaunch;
                var isLtiAUser = $scope.currentUser.isLtiAUser;
                $scope.ltiAClassId = $location.search().classId;
                var isStudent = $scope.isStudent;
                var isRRS = ($scope.content.mediaType === MEDIA_TYPE.REALIZE_READER_SELECTION);
                if (isLtiaResourceLaunch && isLtiAUser && isStudent && isRRS) {
                    return true;
                }
                return false;
            };

            $scope.onLtiAResourceRRSSave = function(event) {
                contentViewerTelemetryService.sendLtiAResourceSaveEvent($scope.content.id, $scope.content.title);
                $scope.onBack(event);
            };

            $scope.showNavigationToRealizeBtn = function() {
                var isRealizeLaunchAllowed = !!$location.search().allowRealizeLaunch;
                if (isRealizeLaunchAllowed && featureManagementService.isFederatedUserHasRealizeAccess()) {
                    return true;
                }
                return false;
            };

            var isIFramed = function() {
                return $location.path().includes('/deeplink');
            };

            var isIFramedAdaptiveContext = function() {
                return (
                    isIFramed() &&
                    assignmentViewerService.isAssignmentViewer() &&
                    ContentViewerData.assignment.isAdaptiveAssignment() &&
                    featureManagementService.isAdaptivePlayerEnabled()
                );
            };
            $scope.isAdaptive = isIFramedAdaptiveContext();

            $scope.shouldHideAssignmentViewerElements = function() {
                return isIFramed();
            };

            if (isIFramed()) {
                $scope.onMarkCompleteEvent = function(taskMetadata) {
                    return $scope.beforeTurnIn().then(function() {
                        return assignmentViewerService.setAssignmentTaskToCompleted(taskMetadata).then(function() {
                            assignmentViewerTelemetryService.sendTelemetryEventMarkAsComplete();
                        });
                    });
                };

                $scope.onTurnedInEvent = function() {
                    var TIMEOUT_TO_RESOLVE = 60000;
                    var assignmentedCompletePromise = $q.defer();
                    var timeout = $q.defer();

                    $rootScope.$broadcast('assignment-viewer.turn.in.initiated');

                    $scope.$on('assignment-viewer.turn.in.success', function() {
                        assignmentedCompletePromise.resolve();
                    });
                    $scope.$on('assignment-viewer.turn.in.failed', function() {
                        assignmentedCompletePromise.reject();
                    });
                    $timeout(function() {
                        timeout.reject(new Error('Request timed out'));
                    }, TIMEOUT_TO_RESOLVE);

                    return $q.race([assignmentedCompletePromise.promise, timeout.promise]);
                };

                $scope.onCloseEvent = function() {
                    if (isIFramedAdaptiveContext()) {
                        return $scope.stopTrackingCurrentRecommendation();
                    } else {
                        var preventNavigation = true;
                        return $scope.sendStopTrackingEvent()
                        .then(function() {
                            return $scope.onBack(null, preventNavigation);
                        })
                        .catch(function() {
                            return $scope.onBack(null, preventNavigation);
                        });
                    }
                };

                $scope.onSaveEvent = function() {
                    var contentItem = $scope.lwcAssignment.contentItem;
                    var extensionsValue = contentItem.id + '/' + contentItem.version;
                    assignmentTelemetryService.sendSaveButtonTelemetryEvent(contentItem.title, extensionsValue);

                    var preventNavigation = true;
                    return $scope.onBack(null, preventNavigation);
                };

                $scope.onSubmitAnswerEvent = function() {
                    if ($scope.isAssessment) {
                        var TIMEOUT_TO_RESOLVE = 6000;
                        var submitAnswerCompletedPromise = $q.defer();
                        var timeout = $q.defer();

                        $scope.submitAnswerDestructor =
                            $scope.$on('uxfReviewItemPlayer.summary.get.success', function(event) {
                                $log.log('Receive event uxfReviewItemPlayer.summary.get.success');
                                if (!event.defaultPrevented) {
                                    event.preventDefault();
                                    submitAnswerCompletedPromise.resolve();
                                }
                            });

                        $scope.$broadcast('content-viewer.recommendation.continue');
                        $timeout(function() {
                            timeout.reject(new Error('Request timed out'));
                        }, TIMEOUT_TO_RESOLVE);
                        return $q.race([submitAnswerCompletedPromise.promise, timeout.promise]);
                    } else {
                        return $q.resolve();
                    }
                };

                $scope.reloadAssessmentSession = function(
                    assessmentSessionId,
                    assessmentBlockType,
                    assessmentTotalQuestionsCount
                ) {
                    $scope.sessionId = assessmentSessionId;
                    $scope.multiStageBlockType = assessmentBlockType;
                    $scope.multiStageTotalQuestionsCount = assessmentTotalQuestionsCount;
                    if ($scope.submitAnswerDestructor) {
                        $scope.submitAnswerDestructor();
                    }
                    $scope.$apply();
                    return;
                };

                $scope.handleEventsFromParent = function(message, payload) {
                    $log.debug('[content viewer]: received event from parent: ', message, payload);
                    switch (message) {
                    case PENPAL_EVENT.MARK_COMPLETE:
                        var taskMetadata = { userAssignmentId: $scope.userAssignmentId };
                        return $scope.onMarkCompleteEvent(taskMetadata);
                    case PENPAL_EVENT.CLOSE:
                        return $scope.onCloseEvent();
                    case PENPAL_EVENT.TURNED_IN:
                        $scope.sendStopTrackingEvent();
                        return $scope.onTurnedInEvent();
                    case PENPAL_EVENT.SAVE:
                        return $scope.onSaveEvent();
                    case PENPAL_EVENT.SUBMIT_ANSWER:
                        return $scope.onSubmitAnswerEvent();
                    case PENPAL_EVENT.RELOAD_ASSESSMENT_SESSION:
                        var assessmentSessionId = payload.assessmentSessionId;
                        var assessmentBlockType = payload.assessmentBlockType || undefined;
                        var assessmentTotalQuestionsCount = payload.assessmentTotalQuestionsCount || 0;
                        return $scope.reloadAssessmentSession(
                            assessmentSessionId,
                            assessmentBlockType,
                            assessmentTotalQuestionsCount
                        );
                    case PENPAL_EVENT.ASSIGNMENT_SUBMITTED_RESOLVED:
                        $scope.isAdaptiveLessonAssignmentSubmitted = true;
                        $scope.showLoading = false;
                        $scope.loaderStyle = {
                            height: ($window.innerHeight - 120) + 'px'
                        };
                        $scope.$apply();
                        return;
                    default:
                        $log.warn('[content viewer]: unknown post message event received: ', message);
                    }
                };

                penpalService.connectToParent($scope.handleEventsFromParent)
                    .then(function(response) {
                        $scope.connectionToParentIFrame = response.connection;
                        $scope.parentIFrame = response.parent;
                    })
                    .catch(function(error) {
                        $log.error('error connecting to parent: ', error);
                    });
                $scope.$on('$destroy', function() {
                    if ($scope.connectionToParentIFrame && $scope.connectionToParentIFrame.destroy) {
                        $scope.connectionToParentIFrame.destroy();
                    }
                });
            }
            $scope.isUploadedContentPdf = function() {
                return featureManagementService.isExternalPdfViewerFebEnabled() &&
                    $scope.content.contribSource === 'My Uploads' &&
                    $scope.content.fileType === CONTENT_CONSTANTS.FILE_TYPE.PDF;
            };

            $scope.showExternalPDFViewer = function() {
                var isExternalPDFViewerEnabled = featureManagementService.isExternalPdfViewerEnabled();
                var isFileTypePDF = $scope.content.fileType === CONTENT_CONSTANTS.FILE_TYPE.PDF;
                var isExternalPdfViewerFebEnabled = featureManagementService.isExternalPdfViewerFebEnabled();
                if (isFileTypePDF && isExternalPdfViewerFebEnabled) {
                    return true;
                }

                // Show external PDF viewer only if the assignment type is not a recommendation.
                if ($scope.isRecommendation && !isExternalPdfViewerFebEnabled) {
                    return false;
                }
                // 1. Show external PDF viewer only in assignment context and if feature flag is enabled.
                var inAssignmentContext = assignmentViewerService.isAssignmentViewer();
                if (!(inAssignmentContext && isFileTypePDF && isExternalPDFViewerEnabled)) {
                    return false;
                }

                // 2. Show external PDF viewer if a TEACHER is 'previewing' an assignment
                //    OR 'reviewing' a student assignment.
                if ($scope.currentUser.isTeacher) {
                    if (ContentViewer.getPreviewStatus($location.path()) || $scope.isReview) {
                        return true;
                    }
                }

                // 3. Show external PDF viewer if a STUDENT launches an assignment.
                return $scope.currentUser.isStudent;
            };

            $scope.$on('pdfContent.viewer.error', function() {
                $scope.showDocViewer = true;
                $scope.$apply();
            });

            var getGoogleDocURL = function() {
                var googleDocURL = $scope.content.url;
                if ($scope.isPreviewMode || !$scope.userAssignmentId ||
                    !assignmentViewerService.isAssignmentViewer()) {
                    return googleDocURL;
                }

                var isGoogleClass = ContentViewerData.ClassRoster.isGoogleClass();
                var isGoogleClassEnabled = ContentViewerData.isGoogleClassroomEnabled;
                var studentObject = $scope.lwcAssignment
                    .findItemMetadataByUserAssignmentId($scope.userAssignmentId);

                if ((isEarlyLearner && isGoogleClass) || (isGoogleClass && isGoogleClassEnabled)) {
                    return constructGoogleDocUrl(studentObject);
                }

                return googleDocURL;
            };

            var constructGoogleDocUrl = function(metadataObj) {
                if (!metadataObj || !metadataObj.studentGoogleDocAssignmentId) {
                    return;
                }
                return [$window.googleDocBaseUrl, metadataObj.studentGoogleDocAssignmentId].join('/');
            };
            $scope.updateAdaptiveAssignmentState = function() {
                if (!_.isEmpty($scope.adaptiveAssignmentState)) {
                    var recommendation = $scope.adaptiveAssignmentState.currentRecommendation;
                    $scope.assessmentId = recommendation.assessmentId;
                    $scope.userAssignmentId = recommendation.userAssignmentId;
                    $scope.noOfStarsAnimated = recommendation.noOfStars;
                    $scope.sessionId = '';
                    $scope.isReview = recommendation.isReview;
                    $scope.isReady = recommendation.isReady;
                } else {
                    $log.log('Unable to restore Adaptive Assignment. Exiting !');
                    $scope.back();
                }
            };

            $scope.showStatusMessage = function(status) {
                if (status === 'true' || status === true) {
                    $scope.notificationMsg = lwcI18nFilter('contentViewer.statusBarMessage.correct');
                    $scope.notificationType = 'success';
                } else {
                    $scope.notificationMsg = lwcI18nFilter('contentViewer.statusBarMessage.incorrect');
                    $scope.notificationType = 'failure';
                }
                lstNotificationService.addNotification($scope.notificationType, $scope.notificationMsg,
                    'true', '3000', angular.element('.content-navbar').height());
            };

            $scope.isPopOverAllowed = function() {
                return $currentUser.isStudent && $scope.isRecommendation && !$scope.isReview;
            };

            $scope.showPopOverAlert = function() {
                return $scope.starPopOverType &&
                    !$currentUser.getAttribute($scope.getStarPopOverAttribute($scope.starPopOverType));
            };

            $scope.getStarPopOverAttribute = function(popOverType) {
                return [$scope.getAdaptiveAssignmentId(), 'popOverShown', popOverType].join('.');
            };

            $scope.updateStarPopOverAttribute = function() {
                var starPopOverAttribute = $scope.getStarPopOverAttribute($scope.starPopOverType);
                $currentUser.setAttribute(starPopOverAttribute, true);
                if ($scope.starPopOverType === CONTENT_CONSTANTS.STAR_POPOVER_TYPE.FIRST_STAR_GAINED) {
                    starPopOverAttribute = $scope.getStarPopOverAttribute(
                        CONTENT_CONSTANTS.STAR_POPOVER_TYPE.FIRST_CORRECT_ANSWER);
                    $currentUser.setAttribute(starPopOverAttribute, true);
                }
            };

            $scope.getStarPopOverText = function() {
                var starPopOverTextKey = ['contentViewer', 'popOverText', $scope.starPopOverType].join('.');
                return lwcI18nFilter(starPopOverTextKey);
            };

            $scope.showStarPopOver = function() {
                $scope.$evalAsync(function() {
                    if ($scope.isPopOverAllowed() && $scope.showPopOverAlert()) {
                        $scope.starPopOverShown = true;
                        $scope.$broadcast('popOverComponent.show');
                        $scope.updateStarPopOverAttribute();
                    } else {
                        $scope.clearPopOver();
                    }
                });
            };

            $scope.$watch('notificationType', function(newValue) {
                if (newValue === 'success' && $scope.noOfStarsAnimated === 0) {
                    $scope.starPopOverType = CONTENT_CONSTANTS.STAR_POPOVER_TYPE.FIRST_CORRECT_ANSWER;
                }
            });

            $scope.$watch('noOfStarsAnimated', function(newValue, oldValue) {
                if (oldValue === 0 && newValue > 0 && newValue < 5) {
                    $scope.starPopOverType = CONTENT_CONSTANTS.STAR_POPOVER_TYPE.FIRST_STAR_GAINED;
                } else if (oldValue && newValue < oldValue) {
                    $scope.starPopOverType = CONTENT_CONSTANTS.STAR_POPOVER_TYPE.FIRST_STAR_LOST;
                }
            });

            $scope.clearPopOver = function() {
                $scope.$broadcast('popOverComponent.close');
                $scope.starPopOverShown = false;
                $scope.starPopOverType = undefined;
            };

            $scope.removePopOverAttributes = function() {
                angular.forEach(CONTENT_CONSTANTS.STAR_POPOVER_TYPE, function(popOverType) {
                    var starPopOverAttribute = $scope.getStarPopOverAttribute(popOverType);
                    $log.log('Deleted ', starPopOverAttribute, $currentUser.deleteAttribute(starPopOverAttribute));
                });
            };

            function contentViewerActionTracking(itemId, itemVersion, userAssignmentId, actionType) {
                // MSDA assignments contain a container/parent id and two stage blocks in it
                // if routeParams contains multiStage param, then pass the parent id to the trackingEvent and heartbeat
                var multiStageAndItemIdVersionExist = $scope.isMultiStage && $routeParams.parentItemId &&
                    $routeParams.parentItemVersion && $routeParams.parentUserAssignmentId;
                itemId = multiStageAndItemIdVersionExist ? $routeParams.parentItemId : itemId;
                itemVersion = multiStageAndItemIdVersionExist ? $routeParams.parentItemVersion : itemVersion;
                userAssignmentId = multiStageAndItemIdVersionExist ?
                    $location.search().parentUserAssignmentId : userAssignmentId;
                if (!$scope.content.isExternalResource()) {
                    var classId = $routeParams.classId || 'na',
                        assignmentId = $scope.getAdaptiveAssignmentId() || 'na',
                        isAdaptiveAssessment = $scope.isRecommendation && $scope.isAssessment;
                    $log.log('Calling trackContent event from content ctrl for :', actionType);
                    return TrackingService.trackContent(
                        classId,
                        itemId,
                        itemVersion,
                        assignmentId,
                        actionType,
                        {
                            userAssignmentId: userAssignmentId,
                            isAdaptiveAssessment: isAdaptiveAssessment
                        }
                    ).then(function() {
                        if (CONTENT_CONSTANTS.CONTENT_VIEWER_ACTIVITY.STOPS === actionType) {
                            var lmsName = '';
                            $log.log('Calling HeartbeatTrackingEvent from content ctrl for :', actionType);
                            return heartbeatContentViewerService.sendHeartbeatTrackingEvent(
                                classId,
                                itemId,
                                itemVersion,
                                assignmentId,
                                actionType,
                                userAssignmentId,
                                lmsName);
                        }
                        return;
                    });
                }
            }

            $scope.gotoSibling = function(content) {
                var base = $location.path().split('content/')[0],
                    url = base + ['content', content.id, content.version].join('/');
                NavigationService.replaceLocationWith(url);
            };

            $scope.startTrackingAdaptiveUserAssignment = function(userAssignmentId) {
                $scope.isTrackingRecommendation = true;
                contentViewerActionTracking(
                    $scope.content.id,
                    $scope.content.version,
                    userAssignmentId,
                    CONTENT_CONSTANTS.CONTENT_VIEWER_ACTIVITY.STARTS);
            };

            $scope.stopTrackingCurrentRecommendation = function() {
                $scope.isTrackingRecommendation = false;
                $log.log('Calling STOP tracking event from stopTrackingCurrentRecommendation');
                return contentViewerActionTracking(
                    $scope.content.id,
                    $scope.content.version,
                    $scope.userAssignmentId,
                    CONTENT_CONSTANTS.CONTENT_VIEWER_ACTIVITY.STOPS);
            };

            $scope.gotoRecommendation = function(recommendation) {
                $scope.adaptiveAssignmentState.currentRecommendation = recommendation;
                ContentResolver(recommendation.itemId, recommendation.itemVersion)
                    .then(function(content) {
                        $scope.updateAdaptiveAssignmentState();
                        $scope.setupContentViewer(content);
                        if (!$scope.isReview) {
                            $scope.startTrackingAdaptiveUserAssignment($scope.userAssignmentId);
                        }
                        $scope.showStarPopOver();
                        if ($scope.isReview) {
                            $scope.isTrackingRecommendation = true;
                        }
                    });
            };

            $scope.loadRecommendation = function() {
                var classId = $routeParams.classId;
                RecommendationFacadeService.getRecommendation(classId, $scope.getAdaptiveAssignmentId(),
                    $scope.isFirstRecommendation)
                    .then(function(recommendation) {
                        var timer;
                        if (recommendation.recommendationStatus && recommendation.recommendationStatus !== 'ready') {
                            $log.log('got Recommendation : ', recommendation);
                            $scope.noOfStarsAnimated = recommendation.noOfStars;
                            //Sleep for 3 seconds to show the star animation
                            timer = $timeout(function() {$scope.processRecommendation(recommendation);}, 3000);
                        } else {
                            $log.log('No More Recommendations : ', recommendation);
                            $scope.noOfStarsAnimated = recommendation.noOfStars;
                            //Sleep for 3 seconds to show the star animation
                            timer = $timeout(function() {$scope.viewReport();}, 3000);
                        }
                        $scope.$on('$destroy', function destroy() {
                            $timeout.cancel(timer);
                        });
                    });
            };

            $scope.processRecommendation = function(recommendation) {
                $scope.isFirstRecommendation = false;
                if (!(recommendation.itemId || recommendation.itemVersion)) {
                    recommendation.itemId = recommendation.assessmentMapping.equellaItemId;
                    recommendation.itemVersion = recommendation.assessmentMapping.equellaItemVersion;
                    recommendation.assessmentId = recommendation.assessmentMapping.assessmentId;
                }
                recommendation.isReview = $scope.isReview;
                recommendation.isReady = $scope.isReady;
                recommendation.noOfStars = $scope.noOfStarsAnimated;
                if (!recommendation.userAssignmentId) {
                    var recommendationId = recommendation.recommendationId,
                        questionId = recommendation.questionId ? recommendation.questionId : recommendation.itemId;
                    RecommendationFacadeService.getUserAssignmentId($routeParams.classId,
                        $scope.getAdaptiveAssignmentId(), recommendation, 'english')
                        .then(function(userAssignmentId) {
                            if (recommendation.assessmentId) {
                                ContentViewer.createAdaptiveStudentSession(recommendation.itemId,
                                    recommendation.itemVersion, userAssignmentId, recommendation.assessmentId)
                                    .then(function(response) {
                                        $scope.createAdaptiveStudentSession = response;
                                        $scope.assessmentId = recommendation.assessmentId;
                                        $log.log('createAdaptiveStudentSession', $scope.createAdaptiveStudentSession);
                                    });
                            }

                            RecommendationFacadeService.sendRecommendationFollowedEvent($routeParams.classId,
                                recommendationId, questionId)
                                .then(function(status) {
                                    $log.log('Recommendation Followed Event Sent', status);
                                    recommendation.userAssignmentId = userAssignmentId;
                                    $scope.gotoRecommendation(recommendation);
                                });
                        });
                } else {
                    $scope.gotoRecommendation(recommendation);
                }
            };

            $scope.submitAssessmentRecommendation = function() {
                $scope.$on('uxfReviewItemPlayer.summary.get.success', function(event) {
                    if (!event.defaultPrevented) {
                        event.preventDefault();
                        $log.log('AssessmentRecommendation ready to submit', event);
                        $scope.showLoading = true;
                        var hubSessionId = event.targetScope.$parent.session.sequence.sessionId,
                            assessmentSessionId = event.targetScope.sessionId,
                            questionId = event.targetScope.listOfQuestion[0];
                        RecommendationFacadeService.submitRecommendation($scope.isAssessment,
                            $routeParams.classId, $scope.getAdaptiveAssignmentId(), $scope.userAssignmentId,
                            questionId, assessmentSessionId, hubSessionId)
                            .then(function(status) {
                                $log.log('AssessmentRecommendation Submitted', status);
                                $scope.showStatusMessage(status);
                                AssignmentFacadeService.setCompleted($scope.userAssignmentId, true)
                                    .then(function(status) {
                                        $log.log('Marked Assessment Recommendation as complete', status);
                                        $scope.stopTrackingCurrentRecommendation();
                                        $scope.next();
                                    });
                            });
                    }
                });

                $scope.$broadcast('content-viewer.recommendation.continue');
            };

            $scope.getAdaptiveAssignmentId = function() {
                if ($scope.isAdaptiveLessonLevelAssignment) {
                    return $scope.lwcAssignment.getChildAdaptiveUserAssignment().assignmentId;
                }
                return $routeParams.assignmentId;
            };

            $scope.submitInstructionalRecommendation = function() {
                RecommendationFacadeService.submitRecommendation($scope.isAssessment, $routeParams.classId,
                    $scope.getAdaptiveAssignmentId(), $scope.userAssignmentId, $scope.content.id)
                    .then(function(status) {
                        $log.log('InstructionalRecommendation Submitted', status);
                        AssignmentFacadeService.setCompleted($scope.userAssignmentId, true)
                            .then(function(status) {
                                $log.log('Marked Instructional Recommendation as complete', status);
                                $scope.stopTrackingCurrentRecommendation();
                                $scope.next();
                            });
                    });
            };

            $scope.next = function(e) {
                var timer,
                    timeoutInMilliseconds = 0;
                if (e && e.currentTarget.disabled) {
                    e.stopPropagation();
                } else {
                    $scope.showLoading = true;
                    //knewton wanted to have 0.5 seconds delay
                    //between submitting an assessment and invoking
                    //underlying Analytical API's
                    if (!$scope.isFirstRecommendation) {
                        timeoutInMilliseconds = 500;
                        $log.log('start delay for loading recommendation : ',
                            moment(Date.now()).format('MM/DD/YYYY hh:mm:ss:SSS'));
                    }
                    timer = $timeout(function() {
                        $log.log('end delay for loading recommendation : ',
                            moment(Date.now()).format('MM/DD/YYYY hh:mm:ss:SSS'));
                        $scope.loadRecommendation();
                    }, timeoutInMilliseconds);
                }
                $scope.$on('$destroy', function destroy() {
                    $timeout.cancel(timer);
                });
            };

            $scope.viewTask = function(task) {
                $scope.showProgress = false;
                $scope.showSummary = false;
                $scope.showLoading = true;
                $scope.isViewProgressPage = false;
                $scope.isReview = task.status !== 'CurrentItem' || $currentUser.isTeacher;
                $scope.processRecommendation(task);
            };

            $scope.loadAdaptiveAssignmentReport = function(e) {
                if (e && e.currentTarget.disabled) {
                    e.stopPropagation();
                } else {
                    if (!$scope.isReview && !$scope.isAssessment) {
                        $scope.stopTrackingCurrentRecommendation();
                    }
                    if ($scope.isAssessment && !$scope.isReview && !$scope.assessmentSubmitted) {
                        $scope.$on('assessment-player.player-directive.assessmentSaved', function(event, data) {
                            if (!event.defaultPrevented) {
                                event.preventDefault();
                                $scope.$evalAsync(function() {
                                    $log.log('assessmentSaved in content ctrl : ', data);
                                    $scope.clearPopOver();
                                    $scope.showLoading = true;
                                    $scope.setupContentViewer(ContentViewerData);
                                });
                            }
                        });
                        $scope.$broadcast('content-viewer.recommendation.save');
                    } else {
                        $scope.$evalAsync(function() {
                            $scope.clearPopOver();
                            $scope.showLoading = true;
                            $scope.clearMediaClass();
                            $scope.setupContentViewer(ContentViewerData);
                        });
                    }
                }
            };

            $scope.disableWarningModal = function() {
                $scope.warningEnabled = false;
            };
            $scope.setContentViewerBannerForAdaptiveAssignmentTeacher = function() {
                $scope.showContentViewerBanner = $currentUser.isTeacher && $scope.tasks.length === 0;
            };
            $scope.viewReport = function() {
                if ($scope.content.fileType === CONTENT_CONSTANTS.FILE_TYPE.SCO ||
                    $scope.content.fileType === CONTENT_CONSTANTS.FILE_TYPE.TIN_CAN_SCO) {
                    angular.element('iframe').remove();
                }

                $scope.showLoading = true;
                studentInfo = $location.search();
                ViewProgressService.getProgressReport($routeParams.classId, $scope.getAdaptiveAssignmentId(),
                    $currentUser.isTeacher, studentInfo.studentId)
                    .then(function(report) {
                        $scope.tasks = report.adaptiveAssignmentDataList;
                        $scope.setContentViewerBannerForAdaptiveAssignmentTeacher();
                        $scope.latestTaskStatus = $scope.tasks.length > 0 ?
                            $scope.tasks[$scope.tasks.length - 1].status : null;
                        if ($currentUser.isTeacher) {
                            $scope.teacherReview = true;
                            $scope.studentName = studentInfo.studentName;
                        } else {
                            $scope.teacherReview = false;
                            $scope.goalStatus = report.noOfStars === 5 ?
                                lwcI18nFilter('contentViewer.assignmentSummary.goalMet', [$scope.tasks.length]) :
                                lwcI18nFilter('contentViewer.assignmentSummary.goalNotMet', [$scope.tasks.length]);
                        }
                        if ($scope.assignmentStatus === 'completed') {
                            $scope.noOfStarsAnimated = report.noOfStars;
                            $scope.showProgress = false;
                            $scope.showSplash = false;
                            $scope.showSummary = true;
                            $scope.showRemainingTasks = false;
                            $scope.isReady = $scope.assignmentStatus !== 'completed';
                        } else if (report.isSplashScreen || $scope.tasks.length === 0) {
                            $scope.noOfStarsAnimated = 0;
                            $scope.isFirstRecommendation = true;
                            $scope.showSplash = true;
                            $scope.maxTasks = report.maximumRecommendationLimit;
                            $scope.startTrackingAdaptiveUserAssignment($scope.getAdaptivePrimaryAssignmentUserId());
                            $scope.trackAdaptiveAssignment = false;
                        } else if (report.isViewSummary && $scope.latestTaskStatus !== null) {
                            $scope.noOfStarsAnimated = report.noOfStars;
                            $scope.showProgress = false;
                            $scope.showSummary = true;
                            $scope.showRemainingTasks = false;
                            $scope.isReady = $scope.assignmentStatus !== 'completed';
                            if ($scope.trackAdaptiveAssignment) {
                                $scope.startTrackingAdaptiveUserAssignment(
                                    $scope.getAdaptivePrimaryAssignmentUserId() ||
                                    $scope.userAssignmentId);
                                $scope.trackAdaptiveAssignment = false;
                            }
                        } else {
                            $scope.noOfStarsAnimated = report.noOfStars;
                            $scope.showSummary = false;
                            $scope.showProgress = true;
                            $scope.maxTasks = report.maximumRecommendationLimit;
                            $scope.showRemainingTasks = $scope.tasks.length !== $scope.maxTasks;
                            $scope.remainingTasks = $scope.maxTasks - $scope.tasks.length;
                            $scope.tasks[$scope.tasks.length - 1].status = 'CurrentItem';
                            if ($scope.trackAdaptiveAssignment) {
                                $scope.startTrackingAdaptiveUserAssignment($scope.getAdaptivePrimaryAssignmentUserId());
                                $scope.trackAdaptiveAssignment = false;
                            } else {
                                $scope.isViewProgressPage = true;
                            }
                        }
                        $scope.showRemainingTaskbar = function() {
                            return $scope.showProgress && !$scope.showSummary && $scope.showRemainingTasks;
                        };
                        $scope.showLoading = false;
                        $rootScope.viewLoading = false;
                    }, function(error) {
                        $log.log('Unable to load progress report. Exiting !', error);
                        $scope.back();
                    });
            };

            $scope.continue = function(e) {
                if (e && e.currentTarget.disabled) {
                    e.stopPropagation();
                } else {
                    //Hiding First Star gain popOver on submit button click
                    $scope.clearPopOver();
                    $scope.clearMediaClass();
                    $scope.disableReportButton = true;
                    $scope.disableContinueButton = true;
                    if (!$scope.assessmentSubmitted) {
                        $log.log('Submitting recommendation');
                        if ($scope.isAssessment) {
                            $scope.submitAssessmentRecommendation();
                        } else {
                            $scope.showLoading = true;
                            $scope.submitInstructionalRecommendation();
                        }
                    } else {
                        $log.log('Recommendation already submitted. Loading next recommendation');
                        $scope.next();
                    }
                }
            };

            $scope.submitAssignment = function(e) {
                if (e && e.currentTarget.disabled) {
                    e.stopPropagation();
                } else {
                    $scope.loaderStyle = {
                        height: ($window.innerHeight - 120) + 'px',
                        position: 'absolute'
                    };
                    $scope.showLoading = true;
                    $scope.removePopOverAttributes();
                    RecommendationFacadeService.submitAssignment($routeParams.classId, $scope.getAdaptiveAssignmentId(),
                        $scope.getAdaptivePrimaryAssignmentUserId())
                        .then(function(status) {
                            if (isIFramed() && $scope.parentIFrame) {
                                contentViewerActionTracking(
                                    $scope.parentContentId,
                                    $scope.parentContentVersion,
                                    $scope.getAdaptivePrimaryAssignmentUserId(),
                                    CONTENT_CONSTANTS.CONTENT_VIEWER_ACTIVITY.STOPS)
                                .then(function() {
                                    $scope.trackAdaptiveAssignment = true;
                                    var payload = { hasEssayScorer: $scope.hasEssayScorer };
                                    $log.log('Calling STOP tracking event from submitAssignment function.');
                                    $scope.parentIFrame.exec(PENPAL_EVENT.ASSIGNMENT_SUBMITTED, payload)
                                    .catch(function(error) {
                                        $log.error('error sending ASSIGNMENTSUBMITTED event to parent: ', error);
                                    });
                                });
                            } else {
                                $log.log('Submitted Adaptive lwcAssignment', status);
                                // Do not redirect if it is multi item assignment.
                                if ($scope.lwcAssignment.isLesson()) {
                                    $scope.isAdaptiveLessonAssignmentSubmitted = true;
                                    $scope.showLoading = false;
                                    $scope.loaderStyle = {
                                        height: ($window.innerHeight - 120) + 'px'
                                    };
                                } else {
                                    $scope.back();
                                }
                            }
                        });
                }
            };

            $scope.getAdaptivePrimaryAssignmentUserId = function() {
                if ($scope.isAdaptiveLessonLevelAssignment) {
                    return $scope.lwcAssignment.getChildAdaptiveUserAssignment().userAssignmentId;
                }
                return $scope.lwcAssignment.getPrimaryMetadata().userAssignmentId;
            };
            $scope.beforeTurnIn = function() {
                clearIFrame(RRS_EVENTS.turnIn);
                if ($scope.isRRSItem) {
                    // resolving this defer on recieving the post message('rrUnloadComplete') from RR
                    // this is to ensure that the scos always saves before marking the assignment
                    // complete [RGHT-72208]
                    // Log will be removed before merging to release
                    $log.debug('RR SCO :: From R: [RGHT-72208] : Defering Promise');
                    return deferredAssignmentCompletion.promise;
                }
                return $q.resolve();
            };

            var pdfViewerCloseEvent = function() {
                var TIMEOUT_TO_RESOLVE = 3000;
                var defer = $q.defer();
                var timeout = $q.defer();
                $rootScope.$broadcast('pdfContent.viewer.close');
                $scope.$on('pdfContent.viewer.close.done', function() {
                    defer.resolve();
                });
                $timeout(function() {
                    timeout.reject(new Error('Request timed out'));
                }, TIMEOUT_TO_RESOLVE);
                return $q.race([defer.promise, timeout.promise]);
            };

            $scope.onBack = function(event, preventNavigation) {
                var inAssignmentContext = assignmentViewerService.isAssignmentViewer();
                var isExternalPDFViewerEnabled = featureManagementService.isExternalPdfViewerEnabled();
                var isFileTypePDF = $scope.content.fileType === CONTENT_CONSTANTS.FILE_TYPE.PDF;
                // Using this method as a proxy so that the Realize waits for RR to save SCOs and
                // give realize a confirmation before it is executes the back functionality
                if ($scope.isRRSItem && !assignmentCompletedAlertHelperService.isAssignmentCompleted()) {
                    clearIFrame(RRS_EVENTS.exit);
                    return deferredAssignmentCompletion
                        .promise
                        .then(function() {
                        $scope.back(event, preventNavigation);
                    });
                }
                if (inAssignmentContext && isExternalPDFViewerEnabled && isFileTypePDF) {
                    return pdfViewerCloseEvent().then(function() {
                        $scope.back(event, preventNavigation);
                    })
                    .catch(function() {
                        $scope.back(event, preventNavigation);
                    });
                }
                // if its a non-rrs item, the back is called immidiately
                $scope.back(event, preventNavigation);
            };

            $scope.back = function(e, preventNavigation) {
                var iframe = document.querySelector('iframe');

                if (e) {
                    e.stopPropagation();
                }

                if ($scope.isLtiaResourceRRSLaunch()) {
                    return;
                }

                $scope.clearMediaClass();

                // [RGHT-2084] allow assessment player to stop playing audio on navigating away from assessment
                // also allow the assessment player to save the response
                $scope.$broadcast('preNavigationChange', 'backButton');

                // We need to trigger the unload event to the iframe window
                // so that TinCan SCO can save the current responses.
                if ($scope.content.fileType === CONTENT_CONSTANTS.FILE_TYPE.TIN_CAN_SCO) {
                    if (iframe) {
                        // try + empty catch is only b/c if the iframe domain doesn't have CORS enabled for our domain,
                        // this will throw an exception and break the 'go back' functionality
                        try {
                            angular.element(iframe.contentWindow).trigger('beforeunload');
                        } catch (e) {}
                    }
                }

                if (!$scope.isRRSItem) {
                    // Not invoking clearIFrame() for RRS items because it is being invoked in
                    // onBack function
                    clearIFrame();
                }

                if (preventNavigation) {
                    return;
                }

                /*
                Since this below code removes all the iframes(unconditionally) from window, it breaks 3rd party
                integrations like Google Drive, which relies on its own Iframe.
                Also the exact reason/issue that was fixed (by the below code) was not clear.
                the below code raises issue - RGHT-55418
                */
                ////////////////////
                // Kill iframe to prevent angular variable binding "flash" issue...
                // TODO: move this hack to somewhere else
                /*if (iframe) {
                    angular.element('iframe').remove();
                }*/
                ////////////////////

                if ($scope.isEarlyLearnerStudent()) {
                    $rootScope.viewLoading = true;
                    if ($location.path().indexOf('assignment') > -1 &&
                        $window.location.href.indexOf('completed') === -1 &&
                        !$currentUser.attemptCompleted &&
                        ($scope.isScoOrTest || $scope.isAdaptive)) {
                        AssignmentFacadeService.getLWCAssignment($routeParams.classId, $routeParams.assignmentId)
                            .then(function(response) {
                                // Special redirect if coming from a sco/test/adaptive assignment
                                if ((response.isScoOrTest() || response.isAdaptiveAssignment()) &&
                                    response.isCompleted()) {
                                    if (!($scope.lwcAssignment && $scope.lwcAssignment.isCompleted())) {
                                        $rootScope.justCompletedAssignment = assignmentId;
                                    }
                                    $location.search('completed', true);
                                    $location.path('/intermediateBackRouteHandler');
                                    return;

                                } else {
                                    $location.path('/intermediateBackRouteHandler');
                                    return;
                                }
                            }, function(err) {
                                $log.log('Failed to retrieve assignment, returning to list', err);
                                $location.path('/intermediateBackRouteHandler');
                                return;
                            });
                    } else {
                        $location.path('/intermediateBackRouteHandler');
                    }
                }

                // strip off the /content/... part
                var path = $location.path(),
                    next = path.split('/content/')[0],
                    force = false,
                    currentSearch = $location.search() || {};

                if (next.search('/myLibrary') === 0 && featureManagementService.isMyLibraryViewerEnabled()) {
                    force = true;
                }
                $location.search('editing', null);
                $location.search('rubric', null);
                $location.search('studentId', null);
                $location.search('studentName', null);

                if (ContentViewerData.siblings && path.match(/\/content\//)) {
                    $scope.goBack(next, true);
                    return;
                }

                // if on the preview page, go back to whence we came...
                if (path.match(/\/edit\/preview$/)) {
                    next = path.split('/preview')[0];
                    force = true;

                } else if (path.match(/\/remediation\//)) {
                    next = path.split('/remediation')[0] + '/remediation';
                    force = true;
                    // if coming from single student page
                } else if (path.match(/\/assignment\//)) {
                    next = path.split('/assignment/')[0];
                } else if (path.match(/\/center\//)) {
                    next = path.split('/center')[0];
                } else if (path.match(/\/sharedwithme\//)) {
                    var splitPath = $location.path().split('content/')[0].split('/');
                    next = [
                        splitPath[1],
                        splitPath[2]
                    ].join('/');
                    $scope.goBack(next, true);
                    return;
                } else if ($location.search().backUrl) {
                    var navigationBackUrl = $location.search().backUrl;
                    NavigationService.navigateOutsideAngularContext(navigationBackUrl);
                    return;
                }

                if (path.match(/\/student\/.*\/preview\//) || path.match(/\/gooru/)) {
                    force = true;
                }

                // Single SCO/TEST/ADAPTIVE assignment special case: go to assignment list page
                if (path.match(/assignments/) && !$currentUser.attemptCompleted &&
                    ($scope.isScoOrTest || $scope.isAdaptive)) {
                    var assignmentId = path.split('assignments/')[1].split('/')[0],
                        assignmentListPage = path.split('assignments')[0] + 'assignments';
                    // this is to fix the back navigation button for the lesson level adaptive assignments
                    // The != operator uses JavaScript's type coercion to check the value for undefined or null.
                    if ($scope.lwcAssignment && $scope.lwcAssignment.parentAssignmentId != null) { // jshint ignore:line
                        assignmentId = $scope.lwcAssignment.parentAssignmentId;
                    }

                    AssignmentFacadeService.getLWCAssignment($routeParams.classId, assignmentId)
                        .then(function(response) {
                            // Special redirect if coming from a sco/test/adaptive assignment
                            if (response.isScoOrTest() || response.isAdaptiveAssignment()) {
                                if ($currentUser.primaryOrgRole === 'Student') {
                                    if (response.isCompleted()) {
                                        if (!($scope.lwcAssignment && $scope.lwcAssignment.isCompleted())) {
                                            $rootScope.justCompletedAssignment = assignmentId;
                                        }
                                        $scope.goBack(assignmentListPage, true);
                                        return;
                                    } else {
                                        $scope.goBack(next, force);
                                        return;
                                    }
                                } else if ($currentUser.isPreviewingAssignment) {
                                    $currentUser.isPreviewingAssignment  = false;
                                    if (path.match('/allstudents/preview') || path.match('/student')) {
                                        next = path.split('/preview')[0];
                                        $scope.goBack(next, force);
                                        return;
                                    } else if (currentSearch.studentNavigationBackId) {
                                        next = 'classes/' + $scope.currentRoster.classId + '/student/' +
                                            currentSearch.studentNavigationBackId + '/assignments';
                                        $scope.goBack(next, true);
                                        return;
                                    }
                                    $scope.goBack(assignmentListPage, true);
                                    return;
                                } else {
                                    $scope.goBack(next, force);
                                    return;
                                }
                            }

                            $scope.goBack(next, force);
                            return;
                        }, function(err) {
                            $log.log('Failed to retrieve lwcAssignment, returning to list', err);
                            $scope.goBack(assignmentListPage, true);
                            return;
                        });

                    return;
                }

                // FIXME: why are we doing this, this is fundamentally wrong
                $currentUser.attemptCompleted = undefined;

                $scope.goBack(next, force);
            };

            $scope.submitEssayHandler = function(submitEssayAction) {
                if (submitEssayAction) {
                    var modalScope = $scope.$new();
                    modalScope.close = Modal.hideDialog;
                    modalScope.dialogId = 'essay-scorer-submit';
                    modalScope.title = lwcI18nFilter('essayScoreAssignment.submit.dialog.modalTitle');
                    modalScope.body = lwcI18nFilter('essayScoreAssignment.submit.dialog.message');
                    modalScope.isDismissible = false;
                    modalScope.buttons = [
                        {title: lwcI18nFilter('essayScoreAssignment.submit.dialog.action.cancel'),
                            clickHandler: modalScope.close},
                        {title: lwcI18nFilter('essayScoreAssignment.submit.dialog.action.submit'),
                            clickHandler: $scope.submitTest, isDefault: true}
                    ];
                    modalScope.dismissed = false;
                    modalScope.closeBtnClickHandler = modalScope.close;
                    Modal.showDialog(PATH.TEMPLATE_CACHE + '/partials/simpleDialog.html', modalScope);
                } else {
                    $scope.warningEnabled = false;
                    $scope.answerError = true;
                }
            };

            $scope.$on('assessment-player.hasEssayScorer.answerError', function(ev, data) {
                $scope.answerError = data.answerError;
                $scope.warningEnabled = data.warningEnabled;
            });

            $scope.$on('assessment-player.hasEssayScorer.warningMessageCode', function(ev, data) {
                var inAssignmentContext = assignmentViewerService.isAssignmentViewer();
                var enableWarning = !(inAssignmentContext && $scope.currentUser.isTeacher);
                if (enableWarning) {
                    if ($scope.isReviewMode !== 'isReviewMode') {
                        $scope.warningEnabled =  true;
                        $scope.warningMessage = data.warningMessage;
                    }
                    $scope.answerError = false;
                }
            });

            $scope.submitTest = function(eve) {
                $scope.warningEnabled = false;
                Modal.hideDialog();
                $scope.$broadcast('essayScorer.submitTest', eve);
            };

            var createPreventResubmissionTestModal = function() {
                var okHandler = function() {
                        $scope.back(event);
                    },

                    title = '',
                    body = 'assessmentBuilder.preventResubmissionTest.message',
                    buttons = {
                        OK: {
                            title: 'global.action.button.ok',
                            handler: okHandler,
                            isDefault: true
                        }
                    };

                Modal.simpleDialog(title, body, buttons, {
                    id: 'preventResubmissionTestModal'
                });
            };

            $scope.$on('assessment-player.player-directive.preventResubmissionTest', function() {
                createPreventResubmissionTestModal();
            });

            $scope.localizeTaskName = function(taskName) {
                var task = lwcI18nFilter('contentViewer.viewProgress.task');
                return task + ' ' + taskName.split(' ')[1];
            };

            $scope.getReviewMode = function() {
                return $scope.isReviewMode || ($scope.isReview && $currentUser.isTeacher);
            };

            $scope.showToolbar = function() {
                var enableToolbar = $scope.enableToolsDropdown() || $scope.enableDownload() ||
                    $scope.showPageNavigation || $scope.hasRubric();

                return ((!($scope.showSummary || $scope.showProgress) && enableToolbar) &&
                    $scope.assignmentViewerHeaderVisible && !$scope.isLanguageSelectOptionEnabled);
            };

            $scope.enableToolsDropdown = function() {
                return (angular.isDefined($scope.content.associatedTools) && $scope.content.associatedTools !== null);
            };

            $scope.showDiscussionLanding = function() {
                return ($scope.content.mediaType === MEDIA_TYPE.DISCUSSION_PROMPT &&
                    $scope.lwcAssignment.isLesson());
            };

            $scope.showAdaptiveBar = function() {
                return ($scope.isRecommendation || $scope.showProgress) && !$scope.showSummary &&
                    !isIFramedAdaptiveContext();
            };

            $scope.hideHeader = function() {
                var shouldHideHeader = isIFramed() && $location.search().hideCVHeader;
                return shouldHideHeader;
            };

            $scope.showNotificationBar = function() {
                var inAssignmentContext = assignmentViewerService.isAssignmentViewer();
                var isExternalPDFViewerEnabled = featureManagementService.isExternalPdfViewerEnabled();
                var isFileTypePDF = $scope.content.fileType === CONTENT_CONSTANTS.FILE_TYPE.PDF;
                var isGoogleDocMediaType = $scope.content.mediaType === MEDIA_TYPE.GOOGLE_DOC;
                var enableNotificationBar = $scope.currentUser.isTeacher && !$scope.isPreviewMode &&
                    !isReviewableAsset($scope.content.mediaType, $scope.content.fileType) &&
                !$scope.showContentViewerBanner && !($scope.isContentUrlInvalid && $scope.isContentUrlRequired);

                $scope.notificationMsg = notificationMessageConstructor.getDefaultMessage();

                if (inAssignmentContext && isExternalPDFViewerEnabled && isFileTypePDF) {
                    enableNotificationBar = false;
                }
                if (inAssignmentContext && isIFramed() && isGoogleDocMediaType) {
                    enableNotificationBar = false;
                }

                if (showInformation($scope.content.mediaType)) {
                    return true;
                }

                if (!angular.isDefined($scope.isPreviewMode) || !angular.isDefined($scope.userAssignmentId)) {
                    return false;
                }

                if ($scope.showRubricScoringWarningMessage() && !isIFramed()) {
                    $scope.notificationMsg = notificationMessageConstructor.getMessageForRubricTestNavScoring();
                    $scope.notificationMsgUrl = notificationMessageConstructor.getMessageUrlForRubricTestNavScoring();
                    $scope.notificationMsgPart3 = notificationMessageConstructor
                        .getMessagePart3ForRubricTestNavScoring();
                    $scope.programTitle =
                        telemetryUtilitiesService.getProgramTitle($scope.lwcAssignment.programHierarchy);
                    return true;
                }

                return enableNotificationBar;
            };

            $scope.showRubricScoringWarningMessage = function() {
                var enableRubricScoringWarningMessage = $scope.content.mediaType === MEDIA_TYPE.TEST &&
                    $scope.hasRubric() && $scope.currentUser.isTeacher && !$scope.isPreviewMode &&
                    isReviewableAsset($scope.content.mediaType, $scope.content.fileType) &&
                    isAssignmentComplete() && isAssignmentItemComplete();

                if (!$scope.isRecommendation) {
                    setAssignmentStatusFromAssignment();
                }
                return enableRubricScoringWarningMessage;
            };

            $scope.displayEditLinkForGoogleDoc =  function(item) {
                if (item.mediaType === MEDIA_TYPE.GOOGLE_DOC &&
                    featureManagementService.isGoogleClassroomEnabled() &&
                    BrowserInfo.OS.isMobileDevice) {
                    return true;
                }
                return false;
            };

            var isAssignmentItemComplete =  function() {
                var itemStatus = $scope.lwcAssignment.
                    getItemStatus($scope.content.id, $location.search().studentId);
                return itemStatus === ASSIGNMENT_CONSTANTS.STATUS.COMPLETED ||
                    itemStatus === ASSIGNMENT_CONSTANTS.STATUS.SUBMITTED;
            };

            var showContentViewerBannerForAdaptiveAssignment = function() {
                $scope.showContentViewerBanner = ASSIGNMENT_CONSTANTS.STATUS.NOT_STARTED === $scope.assignmentStatus;
            };

            var showContentViewerBannerForNonAdaptiveAssignment = function() {
                var studentId = $location.search().studentId;
                $scope.showContentViewerBanner = ASSIGNMENT_CONSTANTS.STATUS.NOT_STARTED ===
                    $scope.lwcAssignment.getItemStatus($scope.content.id, studentId);
            };

            var initializeContentViewerBannerProperties = function() {

                if ($scope.isRRSItem || !angular.isDefined($scope.isPreviewMode)) {
                    return;
                }

                if (!$scope.isPreviewMode && assignmentViewerService.isAssignmentViewer() &&
                    $scope.currentUser.isTeacher &&
                    !($scope.isContentUrlInvalid && $scope.isContentUrlRequired) &&
                    $scope.isAssignmentViewerLesson()) {
                    if ($scope.isAdaptiveLessonLevelAssignment) {
                        showContentViewerBannerForAdaptiveAssignment();
                    } else {
                        showContentViewerBannerForNonAdaptiveAssignment();
                    }
                }
            };

            var isReviewableAsset = function(mediaType, fileType) {
                var reviewableAssetListByMediaType = [MEDIA_TYPE.TEST, MEDIA_TYPE.ADAPTIVE_HOMEWORK,
                    MEDIA_TYPE.REALIZE_READER_SELECTION, MEDIA_TYPE.DISCUSSION_PROMPT];
                var reviewableAssetListByFileType = [CONTENT_CONSTANTS.FILE_TYPE.SCO,
                    CONTENT_CONSTANTS.FILE_TYPE.TIN_CAN_SCO];
                return reviewableAssetListByMediaType.indexOf(mediaType) !== -1 ||
                    reviewableAssetListByFileType.indexOf(fileType) !== -1;
            };

            var showInformation = function(mediaType) {
                if (mediaType === MEDIA_TYPE.REALIZE_READER_SELECTION && assignmentViewerService.isAssignmentViewer() &&
                    ($scope.assignmentStatus === 'submitted' || $scope.assignmentStatus === 'completed')) {
                    if ($scope.currentUser.isTeacher && !$scope.isPreviewMode) {
                        $scope.notificationMsg = notificationMessageConstructor.getMessageForRrsTeacherReview();
                        return true;
                    } else if ($scope.currentUser.isStudent) {
                        $scope.notificationMsg = notificationMessageConstructor.getMessageForRrsStudentSelfReview();
                        return true;
                    }
                }
                return false;
            };

            var notificationMessageConstructor = {
                getMessageForRrsTeacherReview : function() {
                    return lwcI18nFilter('contentViewer.notification.reviewable.nonAssignmentWork.message');
                },
                getMessageForRrsStudentSelfReview : function() {
                    return lwcI18nFilter('contentViewer.notification.student.postTurnIn.selfReviewMessage');
                },
                getDefaultMessage : function() {
                    return lwcI18nFilter('contentViewer.notification.nonReviewable.message');
                },
                getMessageForRubricTestNavScoring : function() {
                    return lwcI18nFilter('assignmentViewer.scoringWarning.messagePart1');
                },
                getMessageUrlForRubricTestNavScoring : function() {
                    return lwcI18nFilter('assignmentViewer.scoringWarning.urlPart2');
                },
                getMessagePart3ForRubricTestNavScoring : function() {
                    return lwcI18nFilter('assignmentViewer.scoringWarning.messagePart3');
                },
            };

            $scope.startTrackingTimeSpent = function() {
                contentViewerActionTracking(
                $scope.content.id,
                $scope.content.version,
                $scope.userAssignmentId,
                CONTENT_CONSTANTS.CONTENT_VIEWER_ACTIVITY.STARTS);
            };

            $scope.currentPageChange = function(currentPageNum) {
                $scope.currentPage = currentPageNum;
            };

            $scope.closeSidebar = function(isRubricPanelClosedFromAssignmentViewer,
                isClosedFromContentViewerWithArrowClose) {
                $scope.showSidePanel = !$scope.showSidePanel;
                var itemExternalId = $scope.content.externalId;
                var programTitle = $scope.rubricConfig.programTitle;
                var isRubricOpened = $scope.showSidePanel;
                if ($scope.showSidePanel) {
                    setTimeout(function() {
                        var element = document.getElementById('rubricCloseButton');
                        var zeroStateRubricElement = document.getElementById('noRubricCloseButton');
                        if (element) {
                            element.focus();
                        } else {
                            zeroStateRubricElement.focus();
                        }
                    }, 100);
                }
                if (!isRubricPanelClosedFromAssignmentViewer) {
                    rubricEventTracking.nonAssignmentRubricButtonEvents(itemExternalId,
                        programTitle,
                        isRubricOpened,
                        isClosedFromContentViewerWithArrowClose);
                }
            };

            var receiveMessage = function(messageData) {
                var data = messageData.data;
                $log.debug('RR SCO :: From R: [RGHT-72208] : ', data);
                if (data.action === 'getGADetails') {
                    var userDetails = {
                        'action': 'GADetails',
                        'GADetails': {
                            'userId': window.btoa($currentUser.userId),  // btoa() for base-64 encoding
                            'userRole': $currentUser.primaryOrgRole,
                            'userOrg': $currentUser.primaryOrgId
                        }
                    };
                    sendPostMessage(userDetails, messageData.source, messageData.origin);
                } else if (data.action === 'getTCConfig' && !$scope.isRRSItem) {
                    // classical realize student side use assignmentUserId, EL student side use userAssignmentId
                    var userAssignmentParamValue = $scope.userAssignmentId;
                    if (userAssignmentParamValue === undefined) {
                        userAssignmentParamValue = '';
                    }
                    TinCanConfigService.getTinCanSCOSettings(userAssignmentParamValue)
                        .then(function(response) {
                            sendPostMessage(response, messageData.source, messageData.origin);
                        });
                } else if (messageData.action === 'getAuthorization' && !$scope.isRRSItem) {
                    TinCanConfigService.getTinCanAuthToken()
                        .then(function(response) {
                            sendPostMessage(response, messageData.source, messageData.origin);
                        });
                } else if (messageData.data.action === 'rrInitialized') {
                    var studentId = $location.search().studentId || '';
                    var assignmentStatus = $scope.assignmentStatus;
                    var response = {
                            action: 'contentViewerData',
                            data: {
                                pages: $scope.content.pages,
                                pageInfoType: $scope.content.pageInfoType,
                                studentId: studentId,
                                assignmentStatus: assignmentStatus,
                                assignmentViewer: assignmentViewerService.isAssignmentViewer(),
                                classId: $routeParams.classId,
                                assignmentId: $routeParams.assignmentId
                            }
                        };
                    sendPostMessage(response, messageData.source, messageData.origin);
                } else if (messageData.data.action === 'rrPageLoadComplete') {
                    $rootScope.$broadcast('multi-assets.enable');
                } else if (messageData.data.action === 'rrUnloadComplete') {
                    // RR will send this message as soon as scos are saved successfully
                    // Resolving this defer will allow Assignment Viewer to complete pending action (mark assignment
                    // as completed, Asset tab switch and Go back)
                    // Logging userAssignmentId to determine if it can be used as a way to validate response

                    // Logs Will be removed before merging to release
                    $log.debug('RR SCO :: From R: [RGHT-72208] : message from RR ', messageData.data);
                    $log.debug('RR SCO :: From R: [RGHT-72208] : Resolving promise for UA:', $scope.userAssignmentId);
                    deferredAssignmentCompletion.resolve();
                } else {
                    $log.log('Not supported call for TCConfig listener.');
                }
            };

            $scope.$on('postMessageEvent', function(event, messageData) {
                receiveMessage(messageData);
            });

            var isCalledFirstTime = true;
            $scope.setupContentViewer(ContentViewerData, isCalledFirstTime);
            // setup the rubric config for CV after the content viewer has been setup
            // because the program title in Rubric config relies on content being present in scope
            if (!assignmentViewerService.isAssignmentViewer()) {
                setupRubricOptionsForContentViewer();
            }

            var getDomainWarnningModalClass = function() {
                var domainWarningModalCss = 'domainWarning__modal';
                if (assignmentViewerService.isAssignmentViewer() && !isEarlyLearner) {
                    domainWarningModalCss = domainWarningModalCss + ' domainWarning__modal--assignmentViewer';
                } else if (!assignmentViewerService.isAssignmentViewer() && isEarlyLearner) {
                    domainWarningModalCss = domainWarningModalCss + ' domainWarning__modal--elContentViewer';
                } else if (assignmentViewerService.isAssignmentViewer() && isEarlyLearner) {
                    domainWarningModalCss = domainWarningModalCss + ' domainWarning__modal--elAssignmentViewer';
                }
                return domainWarningModalCss;
            };

            var setFocusOnNewWindowLink = function() {
                var element = document.getElementById('newWindowLink');
                if (element) {
                    element.focus();
                }
            };

            var newWindow = null;
            var navigationUrl = $window.location.origin + '/community/home';
            var launchRealizeInANewWindow = function() {
                // The LTIA will send value to value of $scope.ltiAClassId.
                if ($scope.ltiAClassId) {
                    navigationUrl = $window.location.origin + '/community/classes/' + $scope.ltiAClassId +
                    '/assignments';
                }
                if (newWindow === null || newWindow.closed) {
                    newWindow = $window.open(navigationUrl, 'com_savvasrealize_window');
                }
                if (newWindow !== null) {
                    newWindow.focus();
                }
            };

            $scope.launchRealizeModalHandler = function() {
                var launchRealizeButton = {
                    label: lwcI18nFilter('launchRealizeModal.button.launchRealize'),
                    action: function() {
                        contentViewerTelemetryService.sendLaunchRealizeEvent();
                        assessmentDialogModal.deactivate();
                        launchRealizeInANewWindow();
                    },
                    className: 'button__launchRealize',
                };
                var closeButton = {
                    label: lwcI18nFilter('launchRealizeModal.button.close'),
                    action: function() {
                        assessmentDialogModal.deactivate();
                    },
                    className: 'button__close',
                };
                var message, messageBody, cssClass;
                if ($scope.isStudent) {
                    cssClass = 'assessmentDialogModal launchRealizeModal__student';
                    message = lwcI18nFilter('launchRealizeModal.student.description.message');
                    messageBody = '';
                } else {
                    cssClass = 'assessmentDialogModal launchRealizeModal';
                    message = lwcI18nFilter('launchRealizeModal.description.message');
                    messageBody = lwcI18nFilter('launchRealizeModal.description.messageBody');
                }

                assessmentDialogModal.activate({
                    cssClass: cssClass,
                    heading: '',
                    description: {
                        heading: '',
                        subHeading: lwcI18nFilter('launchRealizeModal.description.subHeading'),
                        message: message,
                        messageBody: messageBody,
                    },
                    buttons: [closeButton, launchRealizeButton],
                    closeButtonLabel: lwcI18nFilter('launchRealizeModal.button.close'),
                    closeAction: function() {
                        assessmentDialogModal.deactivate();
                    },
                });
            };

            $scope.warningModalHandler = function(contentUrl) {
                /**
                 * get the trustedDomains from window object
                 * if domain not present in content url, please show warning modal
                 * if domain present in url dont show modal popup, open content in new tab
                 */
                var isTrustedDomain = false;
                var domainString = $window.servicesState.trustedDomains;
                var trustedDomains = domainString ? domainString.split('|') : [];
                isTrustedDomain = _.find(trustedDomains, function(element) {
                    return contentUrl.search(element) > -1;
                });

                if (!isTrustedDomain) {
                    var cancelButton = {
                        label: lwcI18nFilter('domainWarningModal.button.cancel'),
                        action: function() {
                            domainWarningModal.deactivate();
                            setFocusOnNewWindowLink();
                        },
                        className: 'domainWarning_cancelButton',
                    };
                    var okButton = {
                        label: lwcI18nFilter('global.action.button.ok'),
                        action: function() {
                            domainWarningModal.deactivate();
                            setFocusOnNewWindowLink();
                            $window.open(contentUrl);
                        },
                        className: 'domainWarning_okButton',
                    };
                    domainWarningModal.activate({
                        cssClass: getDomainWarnningModalClass(),
                        heading: lwcI18nFilter('domainWarningModal.heading'),
                        description: lwcI18nFilter('domainWarningModal.description'),
                        buttons: [cancelButton, okButton],
                        closeButtonLabel: lwcI18nFilter('domainWarningModal.button.close'),
                        closeAction: function() {
                            domainWarningModal.deactivate();
                            setFocusOnNewWindowLink();
                        },
                    });
                } else {
                    $window.open(contentUrl);
                }
            };
        }
    ]);
