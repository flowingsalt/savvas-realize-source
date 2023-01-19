/**
 * Create a separate service that just sets up a  controller.  This is intended to hold the code shared
 * between the Realize content viewer and standalone content viewer.  Kind of a hack, but couldn't think of a cleaner
 * way to handle this.
 */
angular.module('Realize.content.contentViewerService', [
    'Realize.content.model.contentItem',
    'Realize.assessment.assessmentDataService',
    'ModalServices',
    'Realize.paths',
    'RealizeDataServices.ProgramService',
    'Realize.common.mediaQueryService',
    'Realize.content.constants',
    'Realize.constants.mediaType',
    'Realize.constants.external',
    'rlzComponents.components.featureManagement',
])
    .factory('ContentViewer', [
        '$sce',
        '$rootScope',
        '$routeParams',
        '$location',
        '$log',
        '$window',
        '$filter',
        'Content',
        'Assessment',
        'Modal',
        'PATH',
        'PDFVIEWER_PATH',
        'GOOGLE_DOCS_VIEWER_URL',
        'ProgramService',
        'MediaQuery',
        'CONTENT_CONSTANTS',
        'MEDIA_TYPE',
        'BrowserInfo',
        'featureManagementService',
        function($sce, $rootScope, $routeParams, $location, $log, $window, $filter, Content, Assessment, Modal, PATH,
            PDFVIEWER_PATH, GOOGLE_DOCS_VIEWER_URL, ProgramService, MediaQuery, CONTENT_CONSTANTS, MEDIA_TYPE,
            BrowserInfo, featureManagementService) {
            'use strict';

            var ContentViewerUtil = {
                setupController: function($scope, ContentViewerData) {
                    // technically, UX wants this set to 60 if in portrait mode, if download button is
                    // enabled, if tools menu is available and if paging is available.  But, since
                    // download is always disabled for idevices it'll never happen (acknowledged in the
                    // UX mockup).  So, for now, just hardcode to 75.
                    $scope.titleMax = 75;

                    $scope.currentPage = 0;

                    $scope.toolPreview = function(selectedTool) {
                        $scope.toolsDocViewerUrl = this.setDocViewerUrl($scope, selectedTool);

                        Modal.toolDialog($scope, selectedTool, 'Solution', angular.element('#toolsDropButton'));
                    }.bind(this);

                    $scope.loadTools = function() {
                        $scope.loadingTools = true;
                        if ($scope.showSidePanel) {
                            $scope.showSidePanel = false;
                        }
                        ProgramService.loadAssociatedTools($scope.content).then(
                            function() {
                                $scope.loadingTools = false;
                            }, function() {
                                $scope.loadingTools = false;
                            });
                    };

                    $scope.loadToolsDropdown = function() {
                        ProgramService.loadAssociatedTools($scope.content)
                            .then(function(item) {
                                $scope.toolsList = item;
                            });
                    };

                    $scope.toolsMenuConfig = {
                        icon: 'wrench',
                        direction: 'down',
                        text: (!MediaQuery.breakpoint.isDesktop) ?
                            '' : $filter('lwcI18n')('contentViewer.action.tools'),
                        toggleClick: $scope.loadTools,
                        ariaLabelText: $filter('lwcI18n')('contentViewer.action.tools')
                    };

                    if ($routeParams.programId) {
                        // todo: this is basically an alias because controller scope inherits rootScope,
                        //    change references to currentProgram
                        $scope.program = $rootScope.currentProgram;
                    }

                    // the ContentViewerData should be pre-loaded from the route's resolve
                    $scope.content = ContentViewerData;

                    var onAssessmentSessionError = function() {
                        // if we come here then the assessment session could not be created because the qti
                        //    file is either not present or unparsable.

                        if ($scope.content.attachments.length === 0) {
                            // if we come here then the assessment session could not be created because the
                            //    qti file is not present create empty attachment object so that we can skip
                            //    the code in view for attachments is empty.
                            // TODO - feels like there should be a better way to handle this case
                            $scope.content.attachments[0] = {};
                        }
                        // set the mediatype to a value which will make the  view render the "coming soon" message
                        $scope.content.mediaType = MEDIA_TYPE.NOT_AVAILABLE;
                    };

                    var getTestSession = function() {
                        var promise = Assessment.getTestSession(
                                $scope.content.id,
                                $scope.content.version
                            );

                        promise.then(function(response) {
                            $scope.skipSplashScreen = false;
                            $scope.sessionId = response;
                            $log.log('Test found, get session!!', $scope.sessionId, $scope.content.language);
                        }, onAssessmentSessionError);
                        return promise;
                    };

                    var getAdaptiveStudentSession = function(assessmentId) {
                        var promise = Assessment.getAdaptiveStudentSession(
                                $scope.content.id,
                                $scope.content.version,
                                $scope.userAssignmentId,
                                assessmentId
                            );

                        promise.then(function(response) {
                            $scope.skipSplashScreen = true;
                            $scope.sessionId = response;
                            $log.log(
                                'Test found for student , get Adaptive student session!!',
                                $scope.sessionId,
                                $scope.content.language
                            );
                        }, onAssessmentSessionError);
                        return promise;
                    };

                    var getStudentSession = function(createNewSession) {
                        var promise = Assessment.getStudentSession(
                                $scope.content.id,
                                $scope.content.version,
                                createNewSession,
                                $scope.userAssignmentId
                            );

                        promise.then(function(response) {
                            $scope.skipSplashScreen = false;
                            $scope.sessionId = response;
                            $log.log(
                                'Test found for student , get session!!',
                                $scope.sessionId,
                                $scope.content.language
                            );
                        }, onAssessmentSessionError);
                        return promise;
                    };

                    var isAssessmentPreviewPage = function() {
                        return (/.*\/assessment\/.*\/preview$/).test($location.path());
                    };

                    var isAssignmentPreviewPage = function() {
                        return (/.*\/assignments\/.*\/preview/).test($location.path());
                    };

                    var isAssignment = function() {
                        return angular.isDefined($routeParams.assignmentId);
                    };

                    // TEST MEDIA TYPE HANDLING
                    if ($scope.content.mediaType === MEDIA_TYPE.TEST ||
                            $scope.content.mediaType === MEDIA_TYPE.QUESTION_BANK) {
                        var promise;
                        if (!featureManagementService.isAssessmentMaintenancePageEnabled()) {
                            if ($scope.currentUser.isTeacher && (angular.isDefined($routeParams.studentId) ||
                                angular.isDefined($routeParams.userAssignmentId)) && !isAssignmentPreviewPage()) {
                                promise = Assessment.getStudentSessionFromTeacher(
                                        $scope.content.id,
                                        $scope.content.version,
                                        $scope.userAssignmentId
                                    );

                                promise.then(function(sessionIdResponse) {
                                    $scope.tryAgainHandler = undefined;
                                    $scope.skipSplashScreen = false;
                                    Assessment.getSummary(sessionIdResponse)
                                        .then(function(response) {
                                            if (response.status ===
                                                CONTENT_CONSTANTS.STUDENT_STATUS.NOT_STARTED.toUpperCase()) {
                                                $scope.showContentViewerBanner = true;
                                            } else {
                                                $scope.sessionId = sessionIdResponse;
                                            }
                                        });
                                    $log.log('Test found, get session!!', $scope.sessionId);
                                }, onAssessmentSessionError);
                            } else if ($scope.currentUser.isStudent &&
                                angular.isDefined($routeParams.assignmentId)) {
                                if ($scope.isAdaptive && $scope.assessmentId) {
                                    promise = getAdaptiveStudentSession($scope.assessmentId);
                                } else {
                                    // a case when assignment id will be null is when assessment content is
                                    //   requested via LTI and role in the LTI request is 'Student'
                                    promise = getStudentSession(false, false);
                                }
                            } else {
                                // for Realize roles other than Student
                                promise = getTestSession(false);
                            }
                        } else {
                            promise = null;
                        }
                    }

                    if (($scope.content.fileType === CONTENT_CONSTANTS.FILE_TYPE.SCO ||
                        $scope.content.fileType === CONTENT_CONSTANTS.FILE_TYPE.TIN_CAN_SCO) &&
                        $routeParams.assignmentUserId) {
                        $scope.assignmentUserId = $scope.userAssignmentId;
                    }

                    if ($scope.content.fileType === CONTENT_CONSTANTS.FILE_TYPE.TIN_CAN_SCO &&
                        $scope.content.url !== null) {
                        $scope.content.url = $scope.content.url + '?tc=y';
                    }

                    $scope.$watch('content.mediaType', function(mediaType) {
                        if (mediaType === MEDIA_TYPE.DOCUMENT ||
                                mediaType === MEDIA_TYPE.LEVELED_READER) {
                            $scope.content.pages = $scope.content.previews;
                            $scope.currentPage = 1; // doc pages
                        }
                    });

                    $scope.getTitle = function(content) {
                        // Original only if: on preview page or coming from assignment
                        var originalOnly = (isAssessmentPreviewPage() || isAssignment()) ? 'original' : '';

                        if (content) {
                            return content.$getTitle(originalOnly);
                        }

                        return $scope.content.$getTitle(originalOnly);
                    };

                    $scope.assessmentMessageHandler = function(args) {
                        $log.log('assessment message handler', args);

                        var scope = $scope.$new();
                        angular.extend(scope, args);
                        scope.close = Modal.hideDialog;
                        switch (args.messageType) {
                            case 'assessment-player.error':
                                $scope.icon = 'assessment-error';
                                break;

                            case 'assessment-player.question.feedbackcorrect':
                                $scope.icon = 'assessment-feedback-correct';
                                break;

                            case 'assessment-player.question.feedbackincorrect':
                                $scope.icon = 'assessment-feedback-incorrect';
                                break;

                            default:
                                $scope.icon = null;
                                break;
                        }
                        Modal.showDialog('templates/app/programs/toc/assessment/assessmentErrorDialog.html', scope);
                    };

                    $scope.tryAgainHandler = function() {
                        $log.log('assessment try again handler');

                        var scope = $scope.$new();
                        scope.close = Modal.hideDialog;
                        scope.ok = function() {
                            var promise;
                            // Need assignment id for student retry
                            if ($scope.currentUser.isStudent &&
                                angular.isDefined($routeParams.assignmentId)) {
                                promise = getStudentSession(true, true);
                            } else {
                                promise = getTestSession(true);
                            }
                            Modal.hideDialog();
                        };

                        Modal.showDialog('templates/app/programs/toc/assessment/assessmentTryAgainDialog.html', scope);
                    };

                    $scope.download = function(e, item) {
                        e.stopPropagation();
                        e.preventDefault();

                        if (item.restrictedDownloadContent.search(/download/gi) >= 0 && item.url) {
                            $window.open(item.attachments[0].downloadURL, '_blank');
                        }
                    };
                },
                setDocViewerUrl: function($scope, content) {
                    var attachmentUrl = window.origin + content.url;
                    var preSignedUrl = content.preSignedUrl;
                    var docViewerUrl = '';

                    if (content.mediaType === MEDIA_TYPE.DOCUMENT || content.mediaType === MEDIA_TYPE.LEVELED_READER) {
                        if (content.fileType === CONTENT_CONSTANTS.FILE_TYPE.PDF) {
                            docViewerUrl = this.constructPDFDocUrl(content, attachmentUrl);
                        } else {
                            docViewerUrl = GOOGLE_DOCS_VIEWER_URL +
                                '?embedded=true&url=' + encodeURIComponent(preSignedUrl);
                            if ($scope.currentUser.getLocale() === 'es') {
                                docViewerUrl += '&hl=es';
                            }
                        }
                    }
                    var locale = $scope.currentUser.getLocale();
                    var pdfViewerLocalization = function() {
                        var pdfViewer;
                        for (var i = 0; i < window.length; i++) {
                            try {
                                if (window[i].PDFViewerApplicationOptions) {
                                    pdfViewer = window[i].PDFViewerApplicationOptions;
                                }
                            } catch (err) {
                                console.log('window[' + i + '] has a cross-domain restriction, skipping');
                            }
                        }
                        switch (locale) {
                            case 'es':
                                locale = 'es-MX';
                                break;
                            case 'en':
                                locale = 'en-US';
                        }
                        if (pdfViewer) {
                            console.log('Localization for ' + locale);
                            pdfViewer.set('locale', locale);
                        } else {
                            console.log('pdfViewer was not found');
                        }
                    };
                    document.addEventListener('webviewerloaded', pdfViewerLocalization);
                    return $sce.trustAsResourceUrl(docViewerUrl);
                },
                constructPDFDocUrl: function(content, attachmentUrl) {
                    var pdfViewerHTMLUrl = PDFVIEWER_PATH + '/pdf-stream-view-only.html?file=';

                    if (this.enableDownload(content)) {
                        pdfViewerHTMLUrl = PDFVIEWER_PATH + '/pdf-stream-view-download.html?file=';
                    }

                    var pdfDocUrl = attachmentUrl + '#pagemode=none';
                    return [pdfViewerHTMLUrl, pdfDocUrl].join('');
                },
                enableDownload: function(content) {
                    var isMediaTypeGoogleDoc = content.mediaType === MEDIA_TYPE.GOOGLE_DOC;
                    var isContentDownloadable = content.restrictedDownloadContent.toLowerCase().includes('download');
                    var supportedFiletypeForMobileDownload = ['PDF', 'DOC', 'PPT', 'Doc/Docx',
                        'PPT/PPTX', 'DOCX', 'PPTX'];
                    var enableMobileDownload = BrowserInfo.OS.isIOS &&
                        supportedFiletypeForMobileDownload.includes(content.fileType);
                    return isContentDownloadable && (!BrowserInfo.OS.isIOS || enableMobileDownload) &&
                        !isMediaTypeGoogleDoc;
                },
                createAdaptiveStudentSession: function(contentId, contentVersion,
                    assignmentUserId, assessmentId) {
                    return Assessment.getAdaptiveStudentSession(contentId,
                            contentVersion, assignmentUserId, assessmentId);
                },
                getRRSUrl: function(content) {
                    var baseUrl = content.url.split('book')[0];
                    var bookParam = 'book/' + content.bookId;
                    var ticket = '?ticket=' + content.samlTicket;
                    return baseUrl + bookParam + ticket;
                },
                getPreviewStatus: function(path) {
                    if (path.match(/\/preview\//)) {
                        return true;
                    }
                    return false;
                }
            };

            return ContentViewerUtil;
        }
    ]);
