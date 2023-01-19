angular.module('Realize.Discussions.Thread', [
    'components.alert',
    'Discuss.ThreadView',
    'Realize.common.alerts',
    'Realize.paths',
    'Realize.analytics',
    'ModalServices',
    'Realize.discuss.constants',
    'Realize.reporting.data.TrackingService',
    'Realize.constants.fileValidatorType',
    'rlzComponents.components.services.oneDrive',
    'rlzComponents.components.uploadContent.constants',
    'Realize.Discussions.ThreadUtilsSvc'
])
    .constant('AVATAR_PATH', window.mediaPath + '/skins/default/images/profile_icons/')
    .controller('DiscussThreadCtrl', [
        '$scope',
        '$log',
        '$routeParams',
        'DiscussNavigation',
        'InlineAlertService',
        'Messages',
        '$filter',
        'Analytics',
        '$currentUser',
        'TrackingService',
        '$window',
        'Modal',
        'PATH',
        'FILE_VALIDATOR_TYPE',
        'lwcI18nFilter',
        'BrowserInfo',
        'FILE_UPLOAD_ERROR_RESPONSE',
        'attachmentModalUtilService',
        'DISCUSS_CONSTANTS',
        'oneDriveService',
        'Toast',
        'UPLOAD_CONTENT_CONSTANTS',
        'threadUtilsSvc',
        '$location',
        'heartbeatContentViewerService',
        function($scope, $log, $routeParams, DiscussNavigation, InlineAlertService, Messages, $filter, Analytics,
            $currentUser, TrackingService, $window, Modal, PATH, FILE_VALIDATOR_TYPE, lwcI18nFilter, BrowserInfo,
            FILE_UPLOAD_ERROR_RESPONSE, attachmentModalUtilService, DISCUSS_CONSTANTS, oneDriveService, Toast,
            UPLOAD_CONTENT_CONSTANTS, threadUtilsSvc, $location, heartbeatContentViewerService) {
            'use strict';

            var localize = $filter('rlzLocalize'),
                promptType = 'Authored', //TODO: In future story, we will adding user created Prompt too
                promptConfiguration = {},
                replyConfiguration = {},
                threadPageMode = $scope.isDiscussAssignmentReviewMode ? 'review' : 'normal',
                analyticsForThreadViewCtrl = function(category, action, description) {
                    Analytics.track('track.action', {
                        category: category,
                        action: action,
                        label: description
                    });
                },
                delayTime = 900,
                modalScope,
                progressModal,
                showProgress = function() {
                    progressModal = Modal.progressDialog($scope.$new(true), {
                        progressHeader: lwcI18nFilter('myContent.uploadProgress.title'),
                        progressMessage: lwcI18nFilter('myContent.uploadProgress.message')
                    }).then(function() {
                        progressModal.fakeProgress(500);
                    });
                },
                hideProgress = function(isSuccess) {
                    if (!isSuccess) {
                        $scope.uploadInProgress = isSuccess;
                    }
                    if (progressModal && isSuccess) {
                        progressModal
                            .then(function() {
                                return progressModal.progressComplete();
                            })
                            .then(function() {
                                Modal.hideDialog();
                            });
                    } else if (progressModal && !isSuccess) {
                        Modal.hideDialog();
                        progressModal.$destroy();
                    }
                },
                downloadFile = function(response, attachmentInfo) {
                    var decodedUrl = response.data,
                        a = document.createElement('a'),
                        clickEvent;
                    a.style.display = 'none';
                    a.href = decodedUrl;
                    a.download = attachmentInfo.name;

                    if (document.createEvent) {
                        // If IE
                        var type = 'click',
                            canBubble = true,
                            cancelable = true,
                            view = window,
                            detail = 0,
                            screenX = 0,
                            screenY = 0,
                            clientX = 0,
                            clientY = 0,
                            ctrlKey = false,
                            altKey = false,
                            shiftKey = false,
                            metaKey = false,
                            button = 0,
                            relatedTarget = null;

                        clickEvent = document.createEvent('MouseEvent');
                        clickEvent.initMouseEvent(type, canBubble, cancelable, view, detail,
                            screenX, screenY, clientX, clientY, ctrlKey, altKey, shiftKey,
                            metaKey, button, relatedTarget);
                    } else {
                        clickEvent = new MouseEvent('click');
                    }

                    document.body.appendChild(a);
                    a.dispatchEvent(clickEvent);
                    document.body.removeChild(a);
                },
                notifyAttachSuccess = function(id, name, type) {
                    $scope.$broadcast('attach.file.success', {id: id, name: name, type: type});
                    $scope.showAttachSaveReplySuccessful = true;
                },
                attachFileType = '',
                attachDriveLink = function(doc, type) {
                    analyticsForThreadViewCtrl(DISCUSS_CONSTANTS.ANALYTICS.DISCUSS,
                        DISCUSS_CONSTANTS.ANALYTICS.POST_COMMENT, type);
                    showProgress();
                    attachmentModalUtilService
                        .saveLinkAttachment($routeParams.classId, $routeParams.assignmentId, doc.url).then(
                            function(response) {
                                attachFileType = type;
                                hideProgress(true);
                                notifyAttachSuccess(response, doc.name, DISCUSS_CONSTANTS.TYPE_LINK);
                            },
                            function(error) {
                                $log.error('attachDriveLink:', error);
                                hideProgress(false);
                            });
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

            var navigationBackUrl = $location.search().backUrl;
            $scope.isStopTrackingEventSent = false;

            if (promptType === 'Authored') {
                promptConfiguration = {
                    isEditCommentEnabled : false
                };
            }

            $log.info('threadPageMode = ', threadPageMode);

            $scope.configs = {};

            if (threadPageMode === 'review') {
                replyConfiguration.isRemoveCommentEnabled = $currentUser.isTeacher;
                $scope.configs.replyConfigs = replyConfiguration;
            }

            $scope.configs.mode = threadPageMode;
            $scope.configs.attachmentsEnabled = true;
            $scope.configs.promptConfig = promptConfiguration;
            $scope.configs.isHideCommentToggle = true;

            $scope.boardId = $routeParams.boardId;
            $scope.postId = $routeParams.postId;
            $scope.isDiscussionLandingPage =  $routeParams.isDiscussionLandingPage;
            $scope.isLoading = true;
            $scope.participantsNumber = 0;
            $scope.isTracking = false;
            $scope.isVisible = true;

            if ($currentUser.isStudent) {
                $scope.selectedStudent = $currentUser;
            } else {
                var selectedStudentId = _.findWhere($scope.currentRoster.students,
                    {userId: $routeParams.studentId});
                $scope.selectedStudent = $scope.currentRoster.students &&
                    (($routeParams.studentId && selectedStudentId) || $scope.currentRoster.students[0]);
            }
            $scope.isShowCommentToggle = false;

            $scope.$on('discussion.editComment.updateSuccessful', function() {
                analyticsForThreadViewCtrl(DISCUSS_CONSTANTS.ANALYTICS.CLASSES, DISCUSS_CONSTANTS.ANALYTICS.DISCUSS,
                    DISCUSS_CONSTANTS.ANALYTICS.EDIT_COMMENT);
            });

            $scope.$on('discussion.postDetail.removeSuccessful', function() {
                analyticsForThreadViewCtrl(DISCUSS_CONSTANTS.ANALYTICS.CLASSES, DISCUSS_CONSTANTS.ANALYTICS.DISCUSS,
                    DISCUSS_CONSTANTS.ANALYTICS.REMOVE_COMMENT);
            });

            $scope.$on('discussion.postDetail.hideSuccessful', function() {
                analyticsForThreadViewCtrl(DISCUSS_CONSTANTS.ANALYTICS.CLASSES, DISCUSS_CONSTANTS.ANALYTICS.DISCUSS,
                    DISCUSS_CONSTANTS.ANALYTICS.HIDE_COMMENT);
            });

            $scope.$on('discussion.thread-view.goBack', function() {
                $log.log('Inside discussion goBack function in thread.ctrl:', navigationBackUrl);
                // Calling stop tracking and heartbeat content close events synchronously
                if (navigationBackUrl) {
                    $scope.isStopTrackingEventSent = true;
                    sendStopTrackingEvent()
                    .then(function() {
                        DiscussNavigation.back();
                    });
                } else {
                    DiscussNavigation.back();
                }
            });

            function sendStopTrackingEvent() {
                var action = 'stops';
                $log.log('Calling trackContent event from sendStopTrackingEvent function in thread.ctrl');
                return TrackingService.trackContent(
                    $routeParams.classId,
                    $routeParams.itemId,
                    $routeParams.itemVersion,
                    $routeParams.assignmentId,
                    action,
                    {
                        userAssignmentId : $routeParams.userAssignmentId
                    }
                ).then(function() {
                    return sendHeartbeatContentCloseEvent();
                });
            }

            function sendHeartbeatContentCloseEvent() {
                var action = 'stops';
                var lmsName = '';
                $log.log('Calling HeartbeatTrackingEvent from sendHeartbeatContentCloseEvent function in thread.ctrl');
                return heartbeatContentViewerService.sendHeartbeatTrackingEvent(
                    $routeParams.classId,
                    $routeParams.itemId,
                    $routeParams.itemVersion,
                    $routeParams.assignmentId,
                    action,
                    $routeParams.userAssignmentId,
                    lmsName);
            }

            //TODO move to a directive
            $scope.scrollToBottom = function() {
                $('html, body').animate({ scrollTop: $(document).height() }, 'slow');
                return false;
            };

            $scope.$on('discussion.thread-view.postReplySuccessful', function(e, replyData) {
                if ($scope.isDiscussionLandingPage) {
                    analyticsForThreadViewCtrl(DISCUSS_CONSTANTS.ANALYTICS.ASSIGNMENT,
                        DISCUSS_CONSTANTS.ANALYTICS.POST_DISCUSSION_COMMENT);
                } else {
                    analyticsForThreadViewCtrl(DISCUSS_CONSTANTS.ANALYTICS.CLASSES,
                        DISCUSS_CONSTANTS.ANALYTICS.DISCUSS, DISCUSS_CONSTANTS.ANALYTICS.POST_COMMENT);
                }
                if (replyData.replyPosition === 'top' && $scope.numOfComments >= 1) {
                    $scope.showTopPageSaveReplySuccessful = true;
                }
                if (replyData.post.meta.attachment.type === DISCUSS_CONSTANTS.TYPE_LINK ||
                    replyData.post.meta.attachment.type === DISCUSS_CONSTANTS.TYPE_ONEDRIVE) {
                    threadUtilsSvc.sendTelemetryDataFromDiscussionPost(attachFileType,
                        replyData.post.meta.attachment.name, DISCUSS_CONSTANTS.EVENT_TYPE.POST_MY_COMMENT,
                        DISCUSS_CONSTANTS.ANALYTICS.POST_COMMENT);
                    attachFileType = '';
                }

                $scope.postSuccessAlertTargetId = replyData.post.id;

                var successAlert = {
                    type: 'success',
                    msg: [
                        localize($scope
                            .sanitizeCode('discussion.thread.saveReply.inline.successNotification.title')),
                        localize($scope
                            .sanitizeCode('discussion.thread.saveReply.inline.successNotification.message'))
                    ].join(' ')
                };

                InlineAlertService.addAlert($scope.postSuccessAlertTargetId, successAlert);
            });

            $scope.$on('discussion.thread-view.updateSuccessful', function(e, updatedData) {
                if (attachFileType && (updatedData.meta.attachment.type === DISCUSS_CONSTANTS.TYPE_LINK ||
                    updatedData.meta.attachment.type === DISCUSS_CONSTANTS.TYPE_ONEDRIVE)) {
                    threadUtilsSvc.sendTelemetryDataFromDiscussionPost(attachFileType,
                        updatedData.meta.attachment.name, DISCUSS_CONSTANTS.EVENT_TYPE.UPDATE_MY_COMMENT,
                        DISCUSS_CONSTANTS.EVENT_TYPE.UPDATE_COMMENT);
                    attachFileType = '';
                }

                $scope.postSuccessAlertTargetId = updatedData.id;

                var successEditAlert = {
                    type: 'success',
                    msg:[
                        localize($scope
                            .sanitizeCode('discussion.thread.editComment.inline.successNotification.title')),
                        localize($scope
                            .sanitizeCode('discussion.thread.editComment.inline.successNotification.message'))
                    ].join(' ')
                };

                InlineAlertService.addAlert($scope.postSuccessAlertTargetId, successEditAlert);
            });

            $scope.$on('discussion.thread-view.getPostCall.success.emit', function(e, post) {

                if ($scope.configs.attachmentsEnabled) {

                    $scope.postsWithAttachment = [];
                    _.each(post.posts, function(post) {
                        if (post.meta && post.meta.attachment && post.meta.attachment.id) {
                            $scope.postsWithAttachment[post.id] = {
                                id: post.meta.attachment.id,
                                name: post.meta.attachment.name,
                                // default to type 'file' for exisiting attachments
                                type: post.meta.attachment.type || DISCUSS_CONSTANTS.TYPE_FILE
                            };
                        }
                    });

                    $scope.$broadcast('discussion.thread-view.postAttachmentsLoaded', $scope.postsWithAttachment);
                }
                $scope.numOfComments = post.postCount;
                $scope.isLoading = false;
            });

            $scope.$on('discussion.comment.updatePost', function(event, post) {
                post.meta = post.meta || {};
                post.meta.attachment = _.extend({}, post.attachment);

                delete post.attachment;

                $scope.$broadcast('discussion.comment.postUpdated', post);
            });

            $scope.$on('discussion.thread-view.postReplyFailed', function() {
                $scope.showSaveReplyError = true;
            });

            $scope.viewAssignment = function() {
                if ($scope.isTracking) {
                    usageTracking($scope.isTracking);
                    $scope.isTracking = false;
                }

                if ($routeParams.status && $currentUser.isTeacher) {
                    DiscussNavigation.goToStudentAssignmentList($routeParams.classId, $routeParams.studentId,
                            $routeParams.status, $routeParams.activeTab);
                } else {
                    DiscussNavigation.goToStudentStatusView($routeParams.classId, $routeParams.assignmentId);
                }
            };

            $scope.highlightStudentComments = function(student) {
                if ($scope.selectedStudent.userId !== student.userId) {
                    analyticsForThreadViewCtrl(DISCUSS_CONSTANTS.ANALYTICS.CLASSES,
                        DISCUSS_CONSTANTS.ANALYTICS.ASSIGNMENTS, DISCUSS_CONSTANTS.ANALYTICS.REVIEW_DISCUSSION);
                }
                $scope.selectedStudent = student;
                $scope.$broadcast('discussion.thread-view.highlightParticipantComments', student.userId);
                $scope.$broadcast('discussion.thread-view.highlightParticipantComments.post', student.userId);
                delayTime = 300;
            };

            $scope.showFilter = function() {
                if ($scope.isLoading) {
                    return false;
                }
                $scope.$broadcast('discussion.thread-view.highlightParticipantComments',
                $scope.selectedStudent.userId, $scope.participantId);
                return $currentUser.isTeacher;
            };

            $scope.$watch('selectedStudent.userId', function() {
                setTimeout(function() {
                    var highlightComment = angular.element('.selected-post .post-author');
                    if (!!highlightComment && highlightComment.length > 0) {
                        highlightComment.attr('tabindex', 0);
                        highlightComment[0].focus();
                    }
                }, delayTime);
            });

            $scope.$on('discussion.thread-view.highlightParticipantComments.success', function(e, participantsNumber) {
                var studentId = $scope.selectedStudent.userId;
                $scope.participantsNumber = participantsNumber;
                if (participantsNumber.length === 0) {
                    studentId = false;
                }
                $scope.$broadcast('discussion.thread-view.highlightParticipantComments.post', studentId);
            });

            function usageTracking(isTracking) {
                var trackingStatus = isTracking ? 'stops' : 'starts';
                // Not sending stop tracking event from here while navigating outside Realize
                if (isTracking && $scope.isStopTrackingEventSent) {
                    return;
                }
                TrackingService.trackContent(
                    $routeParams.classId || 'na',
                    $routeParams.itemId,
                    $routeParams.itemVersion,
                    $routeParams.assignmentId || 'na',
                    trackingStatus,
                    {
                        userAssignmentId : $routeParams.userAssignmentId
                    }
                );
                if (isTracking) {
                    sendHeartbeatContentCloseEvent();
                }
            }

            $window.onbeforeunload = function() {
                $scope.$apply(usageTracking(true));
            };

            $scope.$on('$destroy', function() {
                $window.onbeforeunload = null;
                if ($scope.isTracking) {
                    usageTracking($scope.isTracking);
                    $scope.isTracking = false;
                }
                if (!!modalScope) {
                    modalScope.$destroy();
                }
                Toast.close();
            });

            usageTracking($scope.isTracking);
            $scope.isTracking = true;

            $scope.showVisibleComments = function() {
                $scope.isVisible = true;
                $scope.$broadcast('discussion.discussHeader.showVisibleComments');
            };

            $scope.showHiddenComments = function() {
                $scope.isVisible = false;
                $scope.$broadcast('discussion.discussHeader.showHiddenComments');
            };

            $scope.$on('discussion.thread-view.showCommentToggle', function(event, isShowCommentToggle) {
                if (isShowCommentToggle && !$scope.isShowCommentToggle) {
                    $scope.isVisible = true;
                }
                $scope.isShowCommentToggle = isShowCommentToggle;
            });

            $scope.$on('discussion.postDetail.showHiddenComments', function() {
                $scope.showHiddenComments();
            });

            $scope.currentCommentText = BrowserInfo.isMobileDevice ?
                lwcI18nFilter('discuss.comment.deviceTextVisible') : lwcI18nFilter('discuss.comment.visible');

            $scope.hiddenCommentText  = BrowserInfo.isMobileDevice ?
                lwcI18nFilter('discuss.comment.deviceTextHidden') : lwcI18nFilter('discuss.comment.hidden');

            $scope.configs.attachConfigs = {
                fileTypeArray: [
                    FILE_VALIDATOR_TYPE.FILE_TYPE_VALIDATOR.DOC_TYPE,
                    FILE_VALIDATOR_TYPE.FILE_TYPE_VALIDATOR.DOCX_TYPE,
                    FILE_VALIDATOR_TYPE.FILE_TYPE_VALIDATOR.PPT_TYPE,
                    FILE_VALIDATOR_TYPE.FILE_TYPE_VALIDATOR.PPTX_TYPE,
                    FILE_VALIDATOR_TYPE.FILE_TYPE_VALIDATOR.JPG_TYPE,
                    FILE_VALIDATOR_TYPE.FILE_TYPE_VALIDATOR.PNG_TYPE,
                    FILE_VALIDATOR_TYPE.FILE_TYPE_VALIDATOR.MP3_TYPE,
                    FILE_VALIDATOR_TYPE.FILE_TYPE_VALIDATOR.MP4_TYPE,
                    FILE_VALIDATOR_TYPE.FILE_TYPE_VALIDATOR.PDF_TYPE
                ],
                maxFileSizeBytes: FILE_VALIDATOR_TYPE.FILE_SIZE_VALIDATOR.MAX_FILE_SIZE,
                minFileSizeBytes: FILE_VALIDATOR_TYPE.FILE_SIZE_VALIDATOR.MIN_FILE_SIZE
            };

            $scope.$on('fileupload.validate.file', function(event, isSizeValid, isTypeValid, selectedFile) {
                $scope.disabledAttachButton = true;
                $scope.isVirusFree = $scope.selectedFile !== selectedFile || $scope.isVirusFree;
                $scope.selectedFile = selectedFile;
                $scope.isFileTypeValid = isTypeValid;
                $scope.isFileMinSizeValid = isSizeValid.minFileSizeValid;
                $scope.isFileMaxSizeValid = isSizeValid.maxFileSizeValid;

                $scope.attachFileSelected = ($scope.isFileMinSizeValid && $scope.isFileMaxSizeValid &&
                    $scope.isFileTypeValid) ?
                    $scope.selectedFile.name : lwcI18nFilter('attachmentModal.action.noFileChosen');

                if ($scope.isFileMinSizeValid && $scope.isFileMaxSizeValid && $scope.isFileTypeValid &&
                    $scope.isVirusFree) {
                    $scope.disabledAttachButton = false;
                }
                $scope.$digest();
            });

            $scope.$on('discussion.attach.file', function() {
                analyticsForThreadViewCtrl(DISCUSS_CONSTANTS.ANALYTICS.DISCUSS,
                    DISCUSS_CONSTANTS.ANALYTICS.POST_COMMENT, DISCUSS_CONSTANTS.ANALYTICS.ATTACH_FILE);
                $scope.attachFileSelected = lwcI18nFilter('attachmentModal.action.noFileChosen');
                modalScope = $scope.$new();
                $scope.disabledAttachButton = true;
                $scope.isFileTypeValid = true;
                $scope.isFileMinSizeValid = true;
                $scope.isFileMaxSizeValid = true;
                $scope.isVirusFree = true;
                modalScope.postTitle = $scope.post.title;
                modalScope.uploadInProgress = false;
                modalScope.close = function() {
                    Modal.hideDialog();
                    modalScope.$destroy();
                };

                modalScope.attachFile = function($event) {
                    if ($event) {
                        $event.preventDefault();
                    }
                    $scope.disabledAttachButton = modalScope.uploadInProgress = true;
                    attachmentModalUtilService
                        .saveAttachment($routeParams.classId, $routeParams.assignmentId, $scope.selectedFile)
                        .then(function(response) {
                            $scope.selectedFile.id = response;
                            modalScope.uploadInProgress = false;
                            modalScope.close();
                            notifyAttachSuccess(response, $scope.selectedFile.name, DISCUSS_CONSTANTS.TYPE_FILE);
                        }, function(error) {
                            if (error.data.trim() === FILE_UPLOAD_ERROR_RESPONSE.AV_SCAN_RESPONSE_TEXT) {
                                modalScope.uploadInProgress = false;
                                $scope.isVirusFree = false;
                                $scope.disabledAttachButton = true;
                            }
                        });
                };

                Modal.showDialog(PATH.TEMPLATE_ROOT + '/common/attachmentModal/attachmentModal.html', modalScope);
            });

            $scope.$on('discussion.attachment.file.download', function(event, attachment) {
                var attachmentInfo = attachment,
                    isFileAttachment = attachment.type === DISCUSS_CONSTANTS.TYPE_FILE,
                    //create a blank window on user click context to avoid popup blocks
                    linkWindow = isFileAttachment ? 0 : $window.open('', '_blank'),
                    analyticsType = isFileAttachment ? DISCUSS_CONSTANTS.ANALYTICS.DOWNLOAD_ATTACHED_FILE
                        : DISCUSS_CONSTANTS.ANALYTICS.DOWNLOAD_ATTACHED_GOOGLE_LINK;

                analyticsForThreadViewCtrl(DISCUSS_CONSTANTS.ANALYTICS.DISCUSS,
                    DISCUSS_CONSTANTS.ANALYTICS.DISCUSS_THREAD, analyticsType);

                attachmentModalUtilService.downloadAttachment($routeParams.classId, $routeParams.assignmentId,
                    attachmentInfo.id, attachmentInfo.name, attachment.type).then(function(response) {
                    if (isFileAttachment) {
                        downloadFile(response, attachmentInfo);
                    } else {
                        linkWindow.location = response.data;
                    }
                });
            });

            $scope.$on('discussion.attach.link', function() {
                angular.element('.googleFilePicker').trigger('click');
            });

            $scope.onAttachDriveLink = function(docs) {
                if (docs.length) {
                    attachDriveLink(docs[0], DISCUSS_CONSTANTS.ANALYTICS.ATTACH_GOOGLE_DRIVE_LINK);
                }
            };

            $scope.$on('discussion.attach.oneDrive', function() {
                $scope.launchOneDrivePicker();
            });

            var onOneDriveSuccess = function(files) {
                $log.log('OneDrive launch success', files);
                if (files.message === UPLOAD_CONTENT_CONSTANTS.ONE_DRIVE_ERROR_CODE) {
                    Toast.error(oneDriveErrorMessage);
                }
                var webUrl = files.value[0].permissions[0].link.webUrl;
                var fileName = files.value[0].name;
                var docs = {
                    url: webUrl,
                    name: fileName
                };
                attachDriveLink(docs, DISCUSS_CONSTANTS.ANALYTICS.ATTACH_ONE_DRIVE_LINK);
            };

            var onOneDriveError = function() {
                $log.error('OneDrive launch failed');
                Toast.error(OneDriveGenericError);
                hideProgress(false);
            };

            var onOneDriveCancel = function() {
                $log.info('OneDrive launch cancelled');
                hideProgress(false);
            };

            $scope.launchOneDrivePicker = function() {
                oneDriveService.launchOneDriveFilePicker(
                    onOneDriveSuccess,
                    onOneDriveCancel,
                    onOneDriveError);
            };
        }
    ]);
