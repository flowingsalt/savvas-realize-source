angular.module('Realize.assignment.common.landingCtrl', [
    'Realize.analytics',
    'Realize.user.currentUser',
    'rlzComponents.components.i18n',
    'Realize.common.alerts',
    'Realize.common.optionalFeaturesService',
    'Realize.paths',
    'Realize.constants.fileUploadErrorResponse',
    'Realize.constants.mediaType',
    'Realize.assignment.constants',
    'rlzComponents.routedComponents.assignments.constants',
    'rlzComponents.components.assignmentViewer',
    'components.alert',
    'rlzComponents.components.assignment.services',
    'rlzComponents.components.services.oneDrive',
    'rlzComponents.components.uploadContent.constants',
    'rlzComponents.components.assignmentViewer.modal',
    'rlzComponents.turnInAllTelemetryModule'
])
.controller('AssignmentLandingCtrl', [
    '$rootScope',
    '$scope',
    '$route',
    '$routeParams',
    '$location',
    '$log',
    '$currentUser',
    'resolveAssignmentData',
    'PATH',
    'Modal',
    'AssignmentFacadeService',
    'FormService',
    'lwcI18nFilter',
    'FILE_UPLOAD_ERROR_RESPONSE',
    'MEDIA_TYPE',
    '$filter',
    'OptionalFeatures',
    'ASSIGNMENT_CONSTANTS',
    'AssignmentUtil',
    'ATTACH_FILE_CONSTANTS',
    'assignmentCompletedAlertHelperService',
    'turnInStateService',
    'Toast',
    'Analytics',
    'LWC_ANALYTICS_CONSTANTS',
    'assignmentScoreHelperService',
    'assignmentHelperService',
    'analyticsHelpersService',
    'oneDriveService',
    'UPLOAD_CONTENT_CONSTANTS',
    'breadcrumbTelemetryService',
    'BREADCRUMB_TELEMETRY_CONSTANTS',
    'assignmentTelemetryService',
    'ASSIGNMENT_TELEMETRY_CONSTANTS',
    'assignmentViewerModal',
    'turnInAllTelemetryService',
    'featureManagementService',
    'redirectService',
    '$window',
    function($rootScope, $scope, $route, $routeParams, $location, $log, $currentUser, resolveAssignmentData,
         PATH, Modal, AssignmentFacadeService, FormService, lwcI18nFilter,
         FILE_UPLOAD_ERROR_RESPONSE, MEDIA_TYPE, $filter, OptionalFeatures, ASSIGNMENT_CONSTANTS, AssignmentUtil,
         ATTACH_FILE_CONSTANTS, assignmentCompletedAlertHelperService, turnInStateService, Toast, Analytics,
         LWC_ANALYTICS_CONSTANTS, assignmentScoreHelperService, assignmentHelperService, analyticsHelpersService,
         oneDriveService, UPLOAD_CONTENT_CONSTANTS, breadcrumbTelemetryService, BREADCRUMB_TELEMETRY_CONSTANTS,
         assignmentTelemetryService, ASSIGNMENT_TELEMETRY_CONSTANTS, assignmentViewerModal, turnInAllTelemetryService,
         featureManagementService, redirectService, $window) {
        'use strict';

        // Init variables
        var discussionPostsSummaries = resolveAssignmentData.discussionPostsSummaries,
            justTurnedIn = false,
            progressModal,
            postCounts = {},
            DISCUSSION_PAST_DUE = 'discussionPastDue',
            NEXT_ITEM = 'nextItem',
            hasPostsForAllDiscussions = true,
            hasPostCommentsForItem = function(item) {
                return postCounts[item.id] && postCounts[item.id] > 0;
            },
            showProgress = function() {
                progressModal = Modal.progressDialog($scope.$new(true), {
                    progressHeader: lwcI18nFilter('myContent.uploadProgress.title'),
                    progressMessage: lwcI18nFilter('myContent.uploadProgress.message')
                }).then(function() {
                    progressModal.fakeProgress(500);
                });
            },
            hideProgress = function() {
                if (progressModal) {
                    progressModal.then(function() {
                        return progressModal.progressComplete();
                    })
                    .then(function() {
                        Modal.hideDialog();
                        progressModal.$destroy();
                    });
                }
            },
            postAction = function(editing, data, title) {
                // Setting assignment to in progress status once user attaches attachment
                if ($scope.assignmentStatus === 'not_started') {
                    AssignmentFacadeService.setInProgress($scope.assignment.$getPrimaryMetadata().userAssignmentId)
                        .then(function(response) {
                            $log.log('Marking assignment to in progress', response);
                        }, function(err) {
                            $log.error('Failed to update assignment status', err);
                        });
                }

                // show one or the other success message depending on whether this was
                // initial attachment or editing an existing attachment
                $scope.showAlert.attachmentEdited = editing;
                $scope.showAlert.attachmentUploaded = !editing;

                //returned data is the new URL
                var primaryMetaData = $scope.assignment.$getPrimaryMetadata();
                primaryMetaData.attachmentUrl = data;
                primaryMetaData.attachmentTitle = title;
                $scope.userAttachmentObj = $scope.assignment.$getUserAttachment();
                $scope.removedAttachment = undefined;
            },
            attachLink = function(attachmentLink, title) {
                var userAssignmentId = $scope.assignment.$getPrimaryMetadata().userAssignmentId,
                    assignmentId = $scope.assignment.assignmentId;
                showProgress();
                AssignmentFacadeService.attachLink(assignmentId, userAssignmentId, attachmentLink, title)
                    .then(function(data) {
                        postAction($scope.assignment.$hasAttachment(), data, title);
                        hideProgress();
                    });
            },
            resetPreview = function() {
                if ($currentUser.isPreviewingAssignment) {
                    $currentUser.isPreviewingAssignment = false;
                    $currentUser.previewItemsStatusList = null;
                }
            };

        var activitiesStateForAsset = {};
        var showActivitiesLabel = lwcI18nFilter('assignmentStatus.action.showActivities');
        var hideActivitiesLabel = lwcI18nFilter('assignmentStatus.action.hideActivities');

        var ASSET_STATUS = {
            IN_PROGRESS: lwcI18nFilter('assignmentViewer.status.inProgress'),
            NOT_STARTED: lwcI18nFilter('assignmentViewer.status.notStarted'),
            KEEP_GOING: lwcI18nFilter('assignmentViewer.turnInModal.actions.keepGoing'),
            GET_STARTED: lwcI18nFilter('assignmentViewer.turnInModal.actions.getStarted')
        };
        var assetSize = {
            number: 0.8,
            title: 5.3,
            status: 2.8,
            action: 3.1
        };
        var cssClassName = 'multiAsset__assignmentViewerModal assignmentLanding__page';
        var SET_FOCUS_TURNIN_BUTTON_TIMEOUT = 500;

        var assignmentCompleteSuccessMessage = {
            msg: [
                '<strong>',
                lwcI18nFilter('assignmentViewer.turnInModal.alertMessages.success.message1'),
                '</strong> ',
                lwcI18nFilter('assignmentViewer.turnInModal.alertMessages.success.message2')
            ].join('')
        };

        var assignmentCompleteErrorMessage = {
            showCloseIcon: true,
            autoClose: false,
            msg: [
                '<strong>',
                lwcI18nFilter('assignmentViewer.turnInModal.alertMessages.error.message1'),
                '</strong> ',
                lwcI18nFilter('assignmentViewer.turnInModal.alertMessages.error.message2')
            ].join('')
        };

        var removeAttachmentAlert = {
            msg: [
                '<strong>',
                lwcI18nFilter('assignmentPreview.successNotification.attachmentUpdated.title'),
                '</strong> ',
                lwcI18nFilter('assignmentPreview.addAttachment.attachmentRemoved')
            ].join(''),
            autoClose: false,
            showCloseIcon: true,
            action: {
                actionId: 'attachFileDeleteUndo',
                actionIconClass: 'icon-undo',
                actionClass: 'attachFile__undoDelete',
                actionLabel: lwcI18nFilter('assignmentPreview.attachment.action.undo'),
                onCustomAction: function() {
                    $scope.reattachAttachment();
                }
            }
        };

        var oneDriveErrorMessage = {
            showCloseIcon: true,
            autoClose: false,
            msg: lwcI18nFilter('myContent.contentUploadForm.oneDrive.oneDriveErrorMessage')
        };

        var OneDriveGenericError = {
            showCloseIcon: true,
            autoClose: false,
            msg: lwcI18nFilter('myContent.contentUploadForm.oneDrive.genericError')
        };

        var getUserPostCounts = function(summary) {
            for (var participantsIndex = 0; participantsIndex < summary.participants.length; participantsIndex++)  {
                if (summary.participants[participantsIndex].author === $currentUser.userId) {
                    return summary.participants[participantsIndex].posts;
                }
            }
            return 0;
        };

        var removeAttachment = function($event) {
            if ($event) {
                $event.stopPropagation();
                $event.preventDefault();
            }
            AssignmentFacadeService.removeAttachment($scope.assignment)
                .then(function(removedAttachment) {
                    Toast.success(removeAttachmentAlert);
                    $scope.removedAttachment = removedAttachment;
                    $scope.userAttachmentObj = undefined;
                }, function(err) {
                    $log.error('Failed to remove attachment', err);
                });
        };

        var needsNumbering = function(asset) {
            return !(asset.mediaType === MEDIA_TYPE.STUDENT_VOICE || asset.mediaType === MEDIA_TYPE.LEARNING_MODEL);
        };

        var generateAssetNumbers = function(assets) {
            var numbersForAssets = {};
            var assetNumber = 1;
            assets.forEach(function(asset) {
                if (needsNumbering(asset)) {
                    numbersForAssets[asset.id] = assetNumber;
                    assetNumber += 1;
                }
            });
            return numbersForAssets;
        };

        var normalizeItem = function(assignment) {
            var flattenedAssets = [];
            if (assignment.$isSingleItemAssignment() || assignment.isAdaptiveAssignment()) {
                flattenedAssets = [assignment.contentItem];
            } else {
                var list = [];
                _.each(assignment.contentItem.contentItems, function(item) {
                    list.push(item);
                    if (item.mediaType === MEDIA_TYPE.LEARNING_MODEL && item.contentItems && item.contentItems.length) {
                        list = list.concat(item.contentItems);
                    }
                });
                flattenedAssets = list;
            }
            if ($currentUser.isTeacher && $currentUser.isPreviewingAssignment) {
                flattenedAssets = _.filter(flattenedAssets, function(asset) {
                    return asset.teacherOnly !== 'Yes';
                });
            }

            angular.forEach(flattenedAssets, function(asset) {
                populateItemStatus(asset);
                checkSCOandTEST(asset);
                setItemWithRRSActivities(asset);
            });

            return flattenedAssets;
        };

        var setItemWithRRSActivities = function(item) {
            //set flag at item level to show rrs activities
            item.isRRSWithActivities = $currentUser.isStudent &&
                (AssignmentUtil.isNotebookEnabled($scope.assignment, item) ||
                    AssignmentUtil.showRRSActivities($scope.assignment, item));
        };

        var checkSCOandTEST = function(assignmentItem) {
            if ($scope.allCompleteInProgress &&
                (assignmentItem.$isScoOrTest() &&
                    assignmentItem.completionStatus !== ASSIGNMENT_CONSTANTS.STATUS.COMPLETED)) {
                $scope.allCompleteInProgress = false;
            }
        };

        // Alert msgs
        var showPastDueWarning = function() {
            return !$scope.assignment.isSingleDiscussion() && !$scope.showAlert.success &&
                !$currentUser.isTeacher &&
                $scope.assignment.$isPastDue() &&
                !$scope.assignment.$isCompleted() &&
                !AssignmentFacadeService.isPastDueWarningDismissed($scope.assignment.assignmentId) &&
                !$scope.assignment.$isRemediationAssignment();
        };

        var hidePastDueWarningOnSuccessAlert = function() {
            if ($scope.showAlert.success || $scope.showAlert.attachmentUploaded || $scope.showAlert.attachmentEdited) {
                $scope.showAlert.pastDueDate = false;
            } else {
                $scope.showAlert.pastDueDate = showPastDueWarning();
            }
        };

        var onAttachFromGoogleDrive = function(docs) {
            if (docs.length) {
                attachLink(docs[0].url, docs[0].name);
            }
        };

        var onOneDriveSuccess = function(files) {
            if (files.message === UPLOAD_CONTENT_CONSTANTS.ONE_DRIVE_ERROR_CODE) {
                Toast.error(oneDriveErrorMessage);
            }
            var webUrl = files.value[0].permissions[0].link.webUrl;
            var fileName = files.value[0].name;
            attachLink(webUrl, fileName);
        };

        var onOneDriveError = function() {
            $log.error('OneDrive launch failed');
            Toast.error(OneDriveGenericError);
        };

        var onOneDriveCancel = function() {
            $log.info('OneDrive launch cancelled');
        };

        $scope.onAttachFromOneDrive = function() {
            oneDriveService.launchOneDriveFilePicker(onOneDriveSuccess,
                onOneDriveCancel, onOneDriveError);
        };

        $scope.showAllActivitiesLabel = function(item) {
            if (featureManagementService.isShowClassesTopnavEnabled()) {
                console.log('isSubmittedOrCompleted', $scope.assignment.isSubmittedOrCompleted());
                return item.isRRSWithActivities && !$scope.assignment.isSubmittedOrCompleted();
            } else {
                return item.isRRSWithActivities;
            }
        };

        // mark items present in previewItemsStatusList as 'complete'
        var setPreviewItemStatus = function(item) {
            var key = [item.id, item.version].join(' ');
            var previewObj = $currentUser.previewItemsStatusList[key];
            if (previewObj) {
                item.completionStatus = ASSIGNMENT_CONSTANTS.STATUS.COMPLETED;
                item.selectedLanguage = previewObj;
            } else {
                item.completionStatus = ASSIGNMENT_CONSTANTS.STATUS.NOT_STARTED;
            }
        };

        // Set item's completionStatus and find 'next_item'
        // pdfs, ppts, docs, images, and videos
        var populateItemStatus = function(assignmentItem) {
            var itemMetadataId = assignmentItem.isExternalResource() ? assignmentItem.originalEquellaItemId :
                assignmentItem.id,
                itemMetadata = $scope.assignment.$findItemMetadata(itemMetadataId);
            if (itemMetadata) {
                if ($currentUser.isPreviewingAssignment) {
                    itemMetadata.status = ASSIGNMENT_CONSTANTS.STATUS.NOT_STARTED;
                }
                assignmentItem.studentMetadata = itemMetadata; //Keep reference for other use.
                var isInProgressOrCompleted = itemMetadata.status === ASSIGNMENT_CONSTANTS.STATUS.IN_PROGRESS ||
                    itemMetadata.status === ASSIGNMENT_CONSTANTS.STATUS.COMPLETED;
                if (!$scope.showLanguageOptions(itemMetadata) || isInProgressOrCompleted) {
                    assignmentItem.selectedLanguage = _.findWhere(itemMetadata.userAssignmentLanguageList, {
                        isSelected: true
                    }).languageLocale;
                    assignmentItem._selectedLanguage = assignmentItem.selectedLanguage;
                }
            } else if (assignmentItem.mediaType !== MEDIA_TYPE.LEARNING_MODEL) {
                $log.error('Did not find studentMetadata for', assignmentItem);
                assignmentItem.missingMetadata = true;
                $scope.allCompleteInProgress = false;
            }

            // If preview mode
            if ($currentUser.isPreviewingAssignment) {
                setPreviewItemStatus(assignmentItem);
            } else if (itemMetadata && itemMetadata.status === ASSIGNMENT_CONSTANTS.STATUS.SUBMITTED) {
                assignmentItem.completionStatus = ASSIGNMENT_CONSTANTS.STATUS.COMPLETED;
            } else if (itemMetadata) {
                assignmentItem.completionStatus = itemMetadata.status;
            }

            if (!nextItemSelected && // Use flag to simulate a break; in angular.forEach
                assignmentItem.mediaType !== MEDIA_TYPE.LEARNING_MODEL &&
                assignmentItem.mediaType !== MEDIA_TYPE.STUDENT_VOICE &&
                assignmentItem.completionStatus === ASSIGNMENT_CONSTANTS.STATUS.NOT_STARTED) {
                assignmentItem.completionStatus = NEXT_ITEM;
                $scope.allCompleteInProgress = false;
                nextItemSelected = true;
            }
        };

        var createTurnInAnalyticsLabel = function() {
            var lwcAssignment = $scope.assignment;
            var totalTasks = lwcAssignment.getTaskList().length;
            var totalCompletedTasks = lwcAssignment.getCompletedTasksCount();
            return [totalCompletedTasks, 'of', totalTasks, 'Complete'].join(' ');
        };

        var sendAnalyticsForTurnIn  = function(eventCategory) {
            try {
                Analytics.track('assignment.action', {
                    status: ASSIGNMENT_CONSTANTS.STATUS.COMPLETED,
                    assignment: $scope.assignment,
                    action: LWC_ANALYTICS_CONSTANTS.ACTION.TURN_IN,
                    category: eventCategory,
                    label: createTurnInAnalyticsLabel()
                });
            }
            catch (error) {
                $log.error('Error in sending GA after turnin', eventCategory, $scope.assignment, error);
            }
        };

        // callback function to be invoked after assignment has been marked as complete
        var assignmentMarkedCompleteFn = function() {
            justTurnedIn = true;
            turnInStateService.setTurnedInAssignmentId($scope.assignment.assignmentId);
            turnInStateService.setTurnInMsg(true);
            $route.reload();
        };

        var markComplete = function(e) {
            var assignmentMetadata = $scope.assignment.$getPrimaryMetadata();
            AssignmentFacadeService.setCompleted(assignmentMetadata.userAssignmentId,
                false, assignmentMetadata.itemType)
                .then(function() {
                    assignmentMarkedCompleteFn(e);
                    // track on google assignment turn in
                    assignmentTelemetryService.trackOnAssignmentTurnIn($scope.assignment, $scope.currentRoster,
                        ASSIGNMENT_TELEMETRY_CONSTANTS.PAGE.ASSIGNMENT_LANDING);
                    sendAnalyticsForTurnIn(LWC_ANALYTICS_CONSTANTS.CATEGORY.ASSIGNMENT);
                }).catch(function(error) {
                $log.error('Failed to mark assignment as complete', error);
                $scope.isInProgress = false;
                Toast.error(assignmentCompleteErrorMessage);
            });
        };

        $scope.assignment = AssignmentUtil.getAssignmentWithProgramHierarchy(resolveAssignmentData);
        $scope.hasEssayScore = $scope.assignment.hasEssayScoring;
        $scope.maxScore = $scope.assignment.maxScore;
        $scope.lastBoardAccessDate = resolveAssignmentData.lastBoardAccessDate;
        $scope.externalId = resolveAssignmentData.externalId;
        $scope.studentUuid = $scope.assignment.getPrimaryMetadata().studentUuid;
        var fileType = $scope.assignment.contentItem.fileType;

        if (discussionPostsSummaries) {
            hasPostsForAllDiscussions = true;
            discussionPostsSummaries.forEach(function(summary) {
                var count = getUserPostCounts(summary);
                if (summary.meta.item) {
                    postCounts[summary.meta.item] = count;
                    if (count === 0) {
                        hasPostsForAllDiscussions = false;
                    }
                }
            });
        }

        // Preview Assignment Mode
        if ($currentUser.isTeacher) {
            // List to keep track what has been previewed, simulate a student's completing an item
            if (!angular.isArray($currentUser.previewItemsStatusList)) {
                $currentUser.previewItemsStatusList = [];
            }
            $currentUser.isPreviewingAssignment = true;
        }

        $scope.allCompleteInProgress = true; // Flag for showing 'Well Done' alert
        var nextItemSelected = false;

        //multilanguages
        $scope.showLanguageOptions = function(metadataObj) {
            return featureManagementService.isHideMultiLangOptioninRealizeAlPageEnabled() ? false :
                $scope.assignment.allowMultipleLanguage && metadataObj.userAssignmentLanguageList.length > 1;
        };

        $scope.assets = normalizeItem($scope.assignment);
        var numbersForAssets = generateAssetNumbers($scope.assets);

        // Set Assignment status
        $scope.assignmentStatus = $scope.assignment.$getAssignmentStatus();

        $scope.showAlert = {};
        $scope.showAlert.success = !$scope.assignment.isSubmittedOrCompleted() &&
            !$scope.assignment.contentItem.$isScoOrTest() &&
            !$scope.assignment.isAdaptiveAssignment() &&
            $scope.allCompleteInProgress && !$scope.assignment.isSingleDiscussion() &&
            !$currentUser.isPreviewingAssignment;
        $scope.showAlert.pastDueDate = showPastDueWarning();
        $scope.showAlert.discussionPastDueDate = $scope.assignment.isSingleDiscussionPastDueDate() &&
            !AssignmentFacadeService.isPastDueWarningDismissed($scope.assignment.assignmentId) &&
            !hasPostsForAllDiscussions;

        // add handlers to hide hide pastDue error when success msg is visible.  Mostly,
        // this is just to avoid console errors you get if you do this from the JSP.
        $scope.$watch('showAlert.attachmentUploaded', hidePastDueWarningOnSuccessAlert);
        $scope.$watch('showAlert.attachmentEdited', hidePastDueWarningOnSuccessAlert);

        $scope.showAlertDiscussion = function(item) {
            var today = moment(),
                pastDueDate = today.isAfter($scope.assignment.$getLegibleDateObj().dueDate);
            return item.mediaType === MEDIA_TYPE.DISCUSSION_PROMPT && pastDueDate && !hasPostCommentsForItem(item);
        };

        $scope.dismissPastDueAlert = function() {
            AssignmentFacadeService.dismissPastDueWarning($scope.assignment.assignmentId);
        };

        $scope.showInstructions = !_.isNull($scope.assignment.instructions) &&
            ($scope.assignment.instructions.length > 0 || $scope.assignment.contentItem.instruction.length > 0) ||
            $scope.assignment.isAdaptiveAssignment() || $scope.assignment.isSingleDiscussion();

        /*
         * Done button: Show if not single item of SCO/TEST,
         *  disabled if assignment completed or marking complete is in progress (except in preview mode)
         * ScoreHeaderRow: Show if SCO or TEST or remediation (but not remediation w/ lesson)
         */
        $scope.disableDoneButton = function() {
            return !$currentUser.isPreviewingAssignment &&
                ($scope.assignment.isSubmittedOrCompleted() || $scope.isInProgress || justTurnedIn);
        };

        if ($scope.assignment.contentItem) {
            $scope.showDoneButton = !($scope.assignment.contentItem.$isScoOrTest() ||
                $scope.assignment.isAdaptiveAssignment() ||
                $scope.assignment.isSingleDiscussion() ||
                $scope.assignment.isMultiStageAssignment());
            $scope.showScoreHeaderRow = $scope.assignment.$isSingleItemAssignment() ||
                $scope.assignment.isAdaptiveAssignment() ||
                (fileType === 'Sequence' && $scope.assignment.contentItem.contentItems &&
                        ($scope.assignment.contentItem.contentItems.length > 0 ?
                        $scope.assignment.contentItem.contentItems[0].fileType !== 'Sequence' : true));
        }

        $scope.getTurnInLabel = function() {
            var turnInLabel = $scope.assignment.isSubmittedOrCompleted() ?
            lwcI18nFilter('assignmentPreview.action.turnedIn') : lwcI18nFilter('assignmentPreview.action.imDone');
            if ($scope.assets.length > 1) {
                turnInLabel = $scope.assignment.isSubmittedOrCompleted() ?
                lwcI18nFilter('assignmentPreview.action.turnedIn') :
                lwcI18nFilter('assignmentPreview.action.imDoneWithAll');
            }
            return turnInLabel;
        };

        //Locking language if completed and multi language
        $scope.lockLanguage = function(item) {
            return (item.completionStatus === ASSIGNMENT_CONSTANTS.STATUS.IN_PROGRESS ||
                item.completionStatus === ASSIGNMENT_CONSTANTS.STATUS.COMPLETED || $scope.showScore(item)) &&
                $scope.showLanguageOptions(item.studentMetadata);
        };

        $scope.switchLanguage = function(e, item, languageObj) {
            if (e) {
                e.stopPropagation();
            }
            $scope.showAlert.languageSelection = false;
            var metadata = item.studentMetadata;
            // Locked or no change
            if ($scope.lockLanguage(item) || languageObj.isSelected) {
                return;
            }

            var updateLanguageSelect = function() {
                // Set all other language to false
                angular.forEach(item.studentMetadata.userAssignmentLanguageList, function(lang) {
                    lang.isSelected = lang.itemUuid === languageObj.itemUuid;
                });
                item._selectedLanguage = languageObj.selectedLanguage;
            };

            if ($currentUser.isPreviewingAssignment) {
                updateLanguageSelect();
            } else {
                AssignmentFacadeService.updateLanguagePreference(metadata.userAssignmentId, languageObj.itemUuid)
                    .then(function() {
                        updateLanguageSelect();
                    }, function(err) {
                        $log.error('Failed to update language preference', err);
                        item.selectedLanguage = item._selectedLanguage;
                    });
            }
        };

        $scope.showScore = function(currentItem) {
            var isManualScore = AssignmentFacadeService.isManualScoreType(currentItem.studentMetadata),
                manualScoreHasBeenSent = isManualScore &&
                    AssignmentFacadeService.isScoreSent(currentItem.studentMetadata),
                hasBeenAutoGraded = !isManualScore &&
                    AssignmentFacadeService.hasScore(currentItem.studentMetadata);
            return !$currentUser.isPreviewingAssignment && (manualScoreHasBeenSent || hasBeenAutoGraded);
        };

        $scope.showStars = function(asset) {
            return asset.mediaType === 'Adaptive Homework' && $scope.showScore(asset) &&
                !featureManagementService.isKnewtonRecommendationDisabled();
        };

        $scope.showFraction = function(asset) {
            return asset.mediaType === 'Adaptive Homework' && $scope.showScore(asset) &&
                featureManagementService.isKnewtonRecommendationDisabled();
        };

        $scope.showAdaptiveScore = function(currentItem) {
            var metadata = currentItem.studentMetadata;
            var info = assignmentScoreHelperService.getScoreInfo($scope.assignment, currentItem, metadata);
            return info.scoreDisplayText;
        };

        $scope.needScore = function(currentItem) {
            return !$currentUser.isPreviewingAssignment &&
                AssignmentFacadeService.isManualScoreType(currentItem.studentMetadata) &&
                !AssignmentFacadeService.isScoreSent(currentItem.studentMetadata);
        };

        $scope.showDash = function(currentItem) {
            var isManualScore = AssignmentFacadeService.isManualScoreType(currentItem.studentMetadata),
                autoGradedWithoutScore = !isManualScore &&
                    !AssignmentFacadeService.hasScore(currentItem.studentMetadata);
            return $currentUser.isPreviewingAssignment || autoGradedWithoutScore;
        };

        $scope.getScore = function(currentItem) {
            if ($scope.hasEssayScore) {
                var score = AssignmentFacadeService.getEssayScore(currentItem.studentMetadata, $scope.maxScore);
                return [$filter('number')(score, 0), $scope.maxScore].join('/');
            }
            return (currentItem.$isScoOrTest() &&
                !AssignmentFacadeService.hasScore(currentItem.studentMetadata) &&
                $scope.assignment.$getAssignmentStatus() === ASSIGNMENT_CONSTANTS.STATUS.COMPLETED) ? 0 :
                    AssignmentFacadeService.getScore(currentItem.studentMetadata);
        };

        var sendAnalyticsForAssignmentDetails  = function(item) {
            try {
                Analytics.track('assignment.action', {
                    status: $scope.assignment.getAssignmentStatus(),
                    assignment: $scope.assignment,
                    action: LWC_ANALYTICS_CONSTANTS.ACTION.OPEN,
                    category: LWC_ANALYTICS_CONSTANTS.CATEGORY.ASSIGNMENT,
                    label: analyticsHelpersService.getAssetType(item),
                });
            }
            catch (error) {
                $log.error(
                    'Error in sending GA after clicking the content',
                    LWC_ANALYTICS_CONSTANTS.ACTION.OPEN,
                    $scope.assignment,
                    error);
            }
        };

        var navigateToAssignmentViewer = function(item, languageObj) {
            var itemId = item.fileType ===
                ASSIGNMENT_CONSTANTS.FILE_TYPE.OPENED ? item.originalEquellaItemId : languageObj.itemUuid;
            var version = languageObj.itemVersion;
            var assignmentId = $scope.assignment.assignmentId;
            var classId = $scope.currentRoster.classId;
            var userAssignmentId = item.studentMetadata.userAssignmentId;
            var isReviewMode;
            if ($scope.hasEssayScore && $scope.assignmentStatus === 'completed') {
                isReviewMode = 'isReviewMode';
            }
            var languageSelected = true;
            redirectService.navigateToAssignmentViewer(itemId, version, classId,
                assignmentId, userAssignmentId, isReviewMode, languageSelected);
        };

        var navigateToPreviewAssignmentViewer = function(item, languageObj) {
            var itemId = item.fileType ===
                ASSIGNMENT_CONSTANTS.FILE_TYPE.OPENED ? item.originalEquellaItemId : languageObj.itemUuid;
            var version = languageObj.itemVersion;
            var assignmentId = $scope.assignment.assignmentId;
            var classId = $scope.currentRoster.classId;
            var userAssignmentId = item.studentMetadata.userAssignmentId;
            var languageSelected = true;
            redirectService.navigateToPreviewAssignmentViewer(itemId, version, classId, assignmentId,
                userAssignmentId, languageSelected);
        };

        // opens item in content viewer
        $scope.open = function(e, item) {
            if (e) {
                e.stopPropagation();
                e.preventDefault();
            }
            sendAnalyticsForAssignmentDetails(item);

            if (item.mediaType === MEDIA_TYPE.LEARNING_MODEL || item.mediaType === MEDIA_TYPE.STUDENT_VOICE) {
                return;
            }
            if (!item.selectedLanguage) {
                $scope.showAlert.languageSelection = true;
                return;
            }
            if (item.missingMetadata) {
                $location.path('error/item-not-found');
            } else {
                var languageObj = _.findWhere(item.studentMetadata.userAssignmentLanguageList, {
                        languageLocale: item.selectedLanguage
                    }),
                    setPath = function(item) {
                        var path = $location.path(),
                            classUuid,
                            assignmentId,
                            prefixUrl;
                        if (item.mediaType === MEDIA_TYPE.ADAPTIVE_HOMEWORK && !$scope.assignment.$isLesson()) {
                            if ($currentUser.isPreviewingAssignment) {
                                path = [path, 'adaptivehomework'].join('/');
                            } else {
                                prefixUrl = path.split('/assignments/')[0];
                                path = [prefixUrl, 'assignments', item.studentMetadata.assignmentId].join('/');
                            }
                        }
                        if (item.$isNbcItem()) {
                            assignmentId = item.studentMetadata.assignmentId;
                            classUuid = item.studentMetadata.classUuid;
                            path = ['/nbclearn/classes',
                                    classUuid,
                                    'assignments',
                                    assignmentId,
                                    'video',
                                    item.id,
                                    item.version].join('/');

                        } else if (item.isDiscussionPrompt()) {
                            assignmentId = item.studentMetadata.assignmentId;
                            classUuid = item.studentMetadata.classUuid;

                            if ($scope.assignmentStatus === 'not_started') {
                                var isAdaptive = $scope.assignment.isAdaptiveAssignment();
                                AssignmentFacadeService.setInProgress(
                                    $scope.assignment.$getPrimaryMetadata().userAssignmentId,
                                    isAdaptive,
                                    classUuid,
                                    assignmentId)
                                    .then(function(response) {
                                        $log.log('Marking assignment to in progress', response);
                                    }, function(err) {
                                        $log.error('Failed to update assignment status', err);
                                    });
                            }

                            path = ['/classes',
                                    classUuid,
                                    'discussPrompt',
                                    'assignments',
                                    assignmentId,
                                    'content',
                                    item.id].join('/');
                            $location.path(path).search({
                                studentId: $routeParams.studentNavigationBackId || $routeParams.studentId,
                                activeTab: $routeParams.activeTab,
                                status: $routeParams.status,
                                userAssignmentId: item.studentMetadata.userAssignmentId,
                                itemVersion: item.version,
                                discuss: !item.studentMetadata.markCompleted ? 'active' : null
                            });

                        } else {
                            var canTeacherPreview = $currentUser.isTeacher &&
                                featureManagementService.isExternalAssignmentViewerPreviewEnabled();
                            var canStudentPreview = $currentUser.isStudent &&
                                featureManagementService.isExternalStudentAssignmentViewerEnabled();
                            if (canStudentPreview) {
                                navigateToAssignmentViewer(item, languageObj);
                                return;
                            }
                            if (canTeacherPreview) {
                                navigateToPreviewAssignmentViewer(item, languageObj);
                                return;
                            }
                            path = [path, 'content', languageObj.itemUuid, languageObj.itemVersion].join('/');

                            if (!$currentUser.isPreviewingAssignment) {
                                if (item.$isScoOrTest()) {
                                    if ((item.fileType === 'SCO' || item.fileType === 'TinCanSCO') &&
                                            item.attachments && item.attachments.length === 0 && !item.url) {
                                        return;
                                    }
                                    if ($scope.assignmentStatus === 'completed') {
                                        $currentUser.attemptCompleted = true;
                                    }
                                }
                                var userAssignmentId = item.studentMetadata.userAssignmentId;
                                path = [path, 'assignmentUserId', userAssignmentId].join('/');
                            }
                            if ($scope.hasEssayScore && $scope.assignmentStatus === 'completed') {
                                path = [path, 'isReviewMode'].join('/');
                            }
                        }
                        $location.path(path);
                    };

                if ($currentUser.isPreviewingAssignment) {
                    // Preview Item: mark item as completed but doesn't make a request to server
                    AssignmentFacadeService.previewItem(item);
                }
                setPath(item);
            }
        };

        if (turnInStateService.checkIsFromTurnIn($scope.assignment.assignmentId)) {
            var assignmentCompletedValue = assignmentCompletedAlertHelperService.getAndClearAssignmentCompleted();
            if (assignmentCompletedValue && assignmentCompletedValue.success) {
                sendAnalyticsForTurnIn(LWC_ANALYTICS_CONSTANTS.CATEGORY.ASSIGNMENT_VIEWER);
            }
            Toast.success(assignmentCompleteSuccessMessage);
            turnInStateService.setTurnedInAssignmentId(null);
            turnInStateService.setTurnInMsg(false);
            // reset the below to avoid showing redundant success alert on listing page
            $rootScope.justCompletedAssignment = null;
        }

        // back to assignment list page
        $scope.back = function(e) {
            e.stopPropagation();
            e.preventDefault();

            resetPreview();

            var path = $location.path(),
                next,
                currentSearch = $location.search();

            if (path.match('/allstudents/preview') || path.match(/\/student|calendar\/.*\/preview/)) {
                // Teacher preview from All Students page or Single student page
                next = path.split('/preview')[0] ;
            } else if (currentSearch && currentSearch.studentNavigationBackId) {
                next = [
                    'classes', $scope.currentRoster.classId,
                    'student', currentSearch.studentNavigationBackId,
                    'assignments'
                ].join('/');
            } else {
                // strip off the /assignment/... part for Teacher preview from list or Student assignment list page
                next = path.split('/assignments/')[0] + '/assignments/';
            }

            $scope.goBack(next, true);
        };

        var filterAssets = function(assets) {
            var assetsWithoutLearningModel = _.filter(assets, function(asset) {
                return asset.mediaType !== MEDIA_TYPE.LEARNING_MODEL && asset.mediaType !== MEDIA_TYPE.STUDENT_VOICE;
            });
            return assetsWithoutLearningModel;
        };

        var setFocusOnTurnInButton = function() {
            var turnInElement = document.getElementById('studentHeaderTurnIn');
            if (turnInElement) {
                turnInElement.focus();
            }
        };

        var closeTurnInModal = function(button) {
            var totalAssetsCount = filterAssets($scope.assets).length;
            if (button === 'CANCEL') {
                turnInAllTelemetryService.sendTelemetryEvent(numberOfAssetsCompleted(), totalAssetsCount,
                false, button);
            }
            setFocusOnTurnInButton();
            return assignmentViewerModal.deactivate();
        };

        var onTurnIn = function(e) {
            $scope.isInProgress = true;
            closeTurnInModal();
            var totalAssetsCount = filterAssets($scope.assets).length;
            turnInAllTelemetryService.sendTelemetryEvent(numberOfAssetsCompleted(), totalAssetsCount,
                false, 'TURN_IN_MODAL');
            if ($currentUser.isPreviewingAssignment) {
                // for preview mode we don't save anything into db
                assignmentMarkedCompleteFn(e);
            } else {
                markComplete(e);
            }
        };

        var getStudentId = function() {
            return $currentUser.isTeacher ? $routeParams.studentId : $currentUser.userId;
        };

        var turnInDescription = function() {
            return {
                heading: '',
                subHeading: lwcI18nFilter('assignmentViewer.turnInModal.heading.message2'),
                assignmentCompleted: false
            };
        };

        var getAssetStatus = function(item, btnLabel) {
            var assetStatus;
            var itemStatus = $scope.assignment.getItemStatus(item.id, getStudentId());
            if (!btnLabel) {
                assetStatus = (itemStatus === ASSIGNMENT_CONSTANTS.STATUS.IN_PROGRESS) ?
                    ASSET_STATUS.IN_PROGRESS : ASSET_STATUS.NOT_STARTED;
            } else {
                assetStatus = (itemStatus === ASSIGNMENT_CONSTANTS.STATUS.IN_PROGRESS) ?
                    ASSET_STATUS.KEEP_GOING : ASSET_STATUS.GET_STARTED;
            }
            return assetStatus;
        };

        var getTurnInDialogId = function() {
            return isAssignmentCompleted() ? 'completeAssignmentTurnInModal' : 'incompleteAssignmentWarningModal';
        };

        var getTurnInTitle = function() {
            return isAssignmentCompleted() ?
                lwcI18nFilter('assignmentViewer.turnInModal.assignmentCompleted.message1') :
                lwcI18nFilter('adminTools.messages.deleteAction.modal.header');
        };

        var getTurnInDescription = function() {
            return isAssignmentCompleted() ?
                lwcI18nFilter('assignmentViewer.turnInModal.assignmentCompleted.message2') :
                lwcI18nFilter('assignmentViewer.turnInModal.description');
        };

        var getTurnInButton = function() {
            return isAssignmentCompleted() ? lwcI18nFilter('assignmentViewer.action.turnInAll') :
                lwcI18nFilter('assignmentPreview.action.done');
        };

        var isAssetCompleted = function(item) {
            var itemStatus = $scope.assignment.getItemStatus(item.id, getStudentId());
            return itemStatus === ASSIGNMENT_CONSTANTS.STATUS.COMPLETED;
        };

        var isAssetInProgress = function(item) {
            var itemStatus = $scope.assignment.getItemStatus(item.id, getStudentId());
            return itemStatus === ASSIGNMENT_CONSTANTS.STATUS.IN_PROGRESS;
        };

        var isAssignmentCompleted = function() {
            var assignmentCompleted = true;
            $scope.assets.forEach(function(asset) {
                if (!isAssetCompleted(asset) &&
                    asset.mediaType !== MEDIA_TYPE.LEARNING_MODEL &&
                    asset.mediaType !== MEDIA_TYPE.STUDENT_VOICE) {
                    assignmentCompleted = false;
                }
            });
            return assignmentCompleted;
        };

        var numberOfAssetsCompleted = function() {
            var count = 0;
            filterAssets($scope.assets).forEach(function(asset) {
                if (isAssetCompleted(asset)) {
                    count += 1;
                }
            });
            return count;
        };

        var isAssetsLoading = function() {
            return false;
        };

        $scope.imDone = function(e) {
            e.preventDefault();
            e.stopPropagation();
            var totalAssetsCount = filterAssets($scope.assets).length;

            //execute only if assignment status is not completed
            if ($scope.assignmentStatus !== ASSIGNMENT_CONSTANTS.STATUS.COMPLETED) {

                //if user clicks imDone button without viewing all items
                if (!$currentUser.isPreviewingAssignment) {
                    if ($scope.assets.length === 1 || isAssignmentCompleted()) {
                        var closeModal = function() {
                            Modal.hideDialog();
                            if (isAssignmentCompleted()) {
                                turnInAllTelemetryService.sendTelemetryEvent(numberOfAssetsCompleted(),
                                totalAssetsCount, false, 'CANCEL');
                            }
                            setTimeout(function() {
                                setFocusOnTurnInButton();
                            }, SET_FOCUS_TURNIN_BUTTON_TIMEOUT);
                        };

                        $scope.confirm = function(e) {
                            if (isAssignmentCompleted()) {
                                turnInAllTelemetryService.sendTelemetryEvent(numberOfAssetsCompleted(),
                                totalAssetsCount, false, 'TURN_IN_MODAL');
                            }
                            $scope.isInProgress = true;
                            Modal.hideDialog();
                            if ($currentUser.isPreviewingAssignment) {
                                // for preview mode we don't save anything into db
                                assignmentMarkedCompleteFn(e);
                            } else {
                                markComplete(e);
                            }
                        };

                        if (isAssignmentCompleted()) {
                            turnInAllTelemetryService.sendTelemetryEvent(numberOfAssetsCompleted(),
                            totalAssetsCount, false, 'TURN_IN_ALL');
                        }
                        var modalScope = $scope.$new();
                        modalScope.dialogId = getTurnInDialogId();
                        modalScope.title = getTurnInTitle();
                        modalScope.body = getTurnInDescription();
                        modalScope.isDismissible = false;
                        modalScope.buttons = [
                            {
                                title: lwcI18nFilter('assignmentPreview.action.cancel'),
                                clickHandler: closeModal
                            },
                            {
                                title: getTurnInButton(),
                                clickHandler: $scope.confirm, isDefault: true
                            }
                        ];
                        modalScope.dismissed = false;
                        modalScope.closeBtnClickHandler = closeModal;

                        Modal.showDialog('templates/partials/simpleDialog.html', modalScope);
                    } else {
                        var cancelButton = {
                            label: lwcI18nFilter('assignmentViewer.turnInModal.actions.cancel'),
                            action: function() {
                                closeTurnInModal('CANCEL');
                            },
                            className: 'button--cancel',
                            disabled: false,
                        };
                        var turnInButton = {
                            label: $scope.getTurnInLabel(),
                            ariaLabel: lwcI18nFilter('assignmentViewer.turnInModal.ariaLabel.modalTurnIn'),
                            action: function(e) {
                                onTurnIn(e);
                            },
                            className: 'button--turnIn',
                            disabled: false,
                        };
                        var buttons = [
                            cancelButton,
                            turnInButton
                        ];
                        assignmentViewerModal.activate({
                            cssClass: cssClassName,
                            heading: lwcI18nFilter('assignmentViewer.turnInModal.heading.message1'),
                            description: turnInDescription(),
                            buttons: buttons,
                            assetsList: filterAssets($scope.assets),
                            assetSize: assetSize,
                            closeAction: function() {
                                closeTurnInModal('CANCEL');
                            },
                            getAssetStatus: function(item, btnLabel) {
                                return getAssetStatus(item, btnLabel);
                            },
                            isAssetCompleted: function(item) {
                                return isAssetCompleted(item);
                            },
                            isAssetInProgress: function(item) {
                                return isAssetInProgress(item);
                            },
                            isAssignmentCompleted: function() {
                                return isAssignmentCompleted();
                            },
                            onNavigateToAsset: function(sequence) {
                                navigateToAsset(sequence);
                            },
                            isAssetsLoading: function() {
                                return isAssetsLoading();
                            }
                        });
                        turnInAllTelemetryService.sendTelemetryEvent(numberOfAssetsCompleted(),
                        totalAssetsCount, false, 'TURN_IN_ALL');
                    }
                } else {
                    // teacher preview mode
                    assignmentMarkedCompleteFn(e);
                }
            }
        };

        /**
         * Attach an item to the assignment.
         *
         * @param $event
         * @param editing boolean indicating whether the attachment is being edited or
         *      uploaded for the first time.   true means attachment is being edited.
         */
        //TODO: Move this (or at least parts of it) to service
        var attachItem = function($event, editing) {
            var modalScope,
                userAssignmentId = $scope.assignment.$getPrimaryMetadata().userAssignmentId;

            if ($event) {
                $event.preventDefault();
                $event.stopPropagation();
            }

            modalScope = $scope.$new();
            modalScope.editing = editing;
            modalScope.uploadAttachmentURL = AssignmentFacadeService.getUploadAttachmentUrl(userAssignmentId);
            modalScope.assignmentTitle = $scope.assignment.title;
            modalScope.uploadInProgress = false;

            modalScope.setFile = function(el) {
                var customFileTypeCheck = function(filename) {
                    // these types are not supported for students...
                    var unsupportedFileTypes = ['TXT', 'GIF', 'RTF'],
                        fileType = FormService.getExtension(filename);

                    return FormService.isValidFileType(fileType) && $.inArray(fileType, unsupportedFileTypes) === -1;
                };

                FormService.setFileValidity(modalScope, el, modalScope.uploadFileForm.file, customFileTypeCheck);
                // Set up some item details
                modalScope.fileName = el.value;
                modalScope.fileType = FormService.getExtension(el.value);
                modalScope.mediaType = FormService.getMediaType(modalScope.fileType);
                modalScope.restrictedDownloadContent = 'Download Only';
            };

            modalScope.ajaxData = {
                assignmentId: $scope.assignment.assignmentId
            };

            modalScope.close = function() {
                Modal.hideDialog();
            };

            modalScope.$on('onAjaxSubmit', function(e, promise) {
                var success, error;
                modalScope.uploadFileForm.file.$setValidity('isVirusFree', true);

                if (!modalScope.fileName) {
                    modalScope.uploadFileForm.file.$setValidity('required', false);
                    return;
                }

                modalScope.uploadError = false;
                modalScope.uploadInProgress = true;

                success = function(data) {
                    postAction(editing, data);
                    modalScope.uploadInProgress = false;
                    Modal.hideDialog();
                };

                error = function(data) {
                    if (data.errorCode === 'filetype') {
                        modalScope.uploadFileForm.file.$setValidity('filetype', false);
                    } else if (data.errorCode === 'filesize') {
                        modalScope.uploadFileForm.file.$setValidity('size', false);
                    } else if (data.responseText.trim() === FILE_UPLOAD_ERROR_RESPONSE.AV_SCAN_RESPONSE_TEXT) {
                        modalScope.uploadFileForm.file.$setValidity('isVirusFree', false);
                    } else {
                        modalScope.uploadError = true;
                    }
                    modalScope.uploadInProgress = false;
                };

                promise.then(success, error);
            });

            Modal.showDialog(PATH.TEMPLATE_ROOT + '/assignment/common/uploadAssignmentAttachment.html', modalScope);
        };

        $scope.reattachAttachment = function($event) {
            if ($event) {
                $event.stopPropagation();
                $event.preventDefault();
            }
            AssignmentFacadeService.reattachAttachment($scope.assignment, $scope.removedAttachment)
                .then(function() {
                    $scope.removedAttachment = undefined;
                    $scope.userAttachmentObj = $scope.assignment.$getUserAttachment();
                }, function(err) {
                    $log.error('Failed to reattach attachment', err);
                });
        };

        var navigateToAsset = function(sequence) {
            var event;
            var assetsList = filterAssets($scope.assets);
            var contentItem = assetsList[sequence];
            closeTurnInModal();
            turnInAllTelemetryService.sendTelemetryEvent(numberOfAssetsCompleted(), assetsList.length,
                false, getAssetStatus(contentItem, true));
            $scope.open(event, contentItem);
        };

        $scope.showCommentSection = function() {
            return OptionalFeatures.isAvailable(ASSIGNMENT_CONSTANTS.OPTIONAL_FEATURES.COMMENTS) &&
                !$currentUser.isPreviewingAssignment && ($scope.assignment.$isCompleted() || $currentUser.isStudent);
        };

        $scope.onAttachFileAction = function(event, action, docs) {
            if (action === ATTACH_FILE_CONSTANTS.ATTACH) {
                attachItem(event, false);
            } else if (action === ATTACH_FILE_CONSTANTS.REMOVE_FILE_ACTION) {
                removeAttachment();
            } else if (action === ATTACH_FILE_CONSTANTS.ATTACH_FROM_GOOGLE_DRIVE) {
                onAttachFromGoogleDrive(docs);
            } else if (action === ATTACH_FILE_CONSTANTS.ATTACH_FROM_ONE_DRIVE) {
                $scope.onAttachFromOneDrive();
            }

        };

        $scope.toggleRRSActivities = function(asset, event) {
            if (event) {
                event.stopPropagation();
            }
            activitiesStateForAsset[asset.id] = !activitiesStateForAsset[asset.id];
        };

        $scope.getActivitiesLabel = function(asset) {
            return activitiesStateForAsset[asset.id] ? hideActivitiesLabel : showActivitiesLabel;
        };

        $scope.showRRSActivities = function(asset) {
            return asset.isRRSWithActivities && activitiesStateForAsset[asset.id];
        };

        $scope.getAssetInfo = function(asset) {
            var assetStatus = asset.completionStatus;
            if (!assetStatus && $scope.showAlertDiscussion(asset)) {
                assetStatus = DISCUSSION_PAST_DUE;
            }
            var displayStatus = assetStatus === NEXT_ITEM ? ASSIGNMENT_CONSTANTS.STATUS.NOT_STARTED : assetStatus;
            return {
                assetNumber: numbersForAssets[asset.id] || '',
                assetNumberStatus: assignmentScoreHelperService.getFormattedStatusText(assetStatus),
                displayStatus: assignmentScoreHelperService.getStatusText(displayStatus)
            };
        };

        $scope.getPostCommentMessageKey = function() {
            return $scope.assignmentStatus === ASSIGNMENT_CONSTANTS.STATUS.COMPLETED ?
                'assignmentPreview.comments.newCommentAlert.completed' :
                'assignmentPreview.comments.newCommentAlert.notCompleted';
        };

        $scope.showHideMinFileSizeError = function(file) {
            return file && (!file.$error.required &&
                !file.$error.filetype &&
                !file.$error.size &&
                !file.$error.isVirusFree &&
                file.$error.minFileSize);
        };

        $scope.disableAttachButton = function(file) {
            return file && (file.$pristine ||
                file.$error.size ||
                file.$error.required ||
                file.$error.filetype ||
                file.$error.isVirusFree ||
                file.$error.minFileSize);
        };

        $scope.breadcrumbHandler = function($event, url, breadcrumb) {
            $event.stopPropagation();
            var breadcrumbItem = $event.currentTarget.text;
            var subpageKey = $currentUser.isStudent ? BREADCRUMB_TELEMETRY_CONSTANTS.SUBPAGE.
                INDIVIDUAL_ASSIGNMENT_DETAIL : BREADCRUMB_TELEMETRY_CONSTANTS.SUBPAGE.PREVIEW;
            var extensionKeys = {
                page: BREADCRUMB_TELEMETRY_CONSTANTS.PAGE.ASSIGNMENT,
                subpage: subpageKey,
                area: BREADCRUMB_TELEMETRY_CONSTANTS.AREA.CLASSES,
            };
            breadcrumbTelemetryService.sendTelemetryEvents(breadcrumbItem, breadcrumb, extensionKeys);
            if (featureManagementService.isShowBrowseTopnavEnabled()) {
                $window.location.href = $window.location.protocol +
                    '//' + $window.location.hostname + '/dashboard/' + url;
            } else {
                AssignmentUtil.navigateToSourceProgram(url);
            }
        };

        $scope.$on('$destroy', function() {
            Toast.close();
        });
    }
]);
