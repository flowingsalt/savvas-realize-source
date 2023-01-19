var searchParams = getSearchParams(),
    USE_MOCKS = (searchParams && searchParams.e2etest && searchParams.e2etest === 'mocked') ||
    localStorage.USE_MOCKS === 'true';

angular.module('RealizeDirectives', [
    'ngSanitize',
    'TypeaheadInitializer',
    'Realize.common.helpers',
    'Realize.common.alerts',
    'Realize.content',
    'Realize.common.mediaQueryService',
    'lst.search.widget',
    'Realize.profile.itemBoxes',
    'Realize.program.content.toolbar',
    'Realize.dragAndDrop.directives',
    'rlzComponents.components.rubricSidePanel',
    'rlzComponents.components.browseAll',
    'Realize.constants.lexileTelemetry',
    'Realize.constants.draTelemetry'
]);

angular.module('RealizeDataServices', [
    'Realize.paths',
    'RealizeDataServices.ProgramService',
    'Realize.common.keyStore',
    'Realize.common.helpers',
    'Realize.common.browserInfoService',
    'Realize.common.mediaQueryService',
    'Realize.NbcLearn.Constants',
    'Realize.content',
    'Realize.standards.standardDataService' // for Content.js - will deprecate soon
]);

angular.module('ModalServices', [
    'Realize.common.keyboardSupport.keyCodes',
    'NotebookApp',
]);

try {
    angular.module('Realize.Discussions');
} catch (e) {
    angular.module('Realize.Discussions', []);
}

try {
    angular.module('realize.templates');
} catch (e) {
    angular.module('realize.templates', []);
}

angular.module('RealizeApp', [
        'Realize.api',
        'RealizeApp.Config',
        'RealizeApp.logout',
        'ngRoute',
        'ngAnimate',
        'Realize.ui.tokenEnabledSrc',
        'ui.bootstrap',
        'Realize.filters',
        'RealizeDataServices',
        'Realize.ExternalItem',
        'Realize.content',
        'Realize.classRoster',
        'ModalServices',
        'AssessmentServices',
        'ui',
        'ui.sortable',
        'RealizeDirectives',
        'Realize.quicklinks',
        'webStorageModule',
        'Realize.eText',
        'Realize.discussionPrompt',
        'Realize.standards',
        'Realize.leveledReaders',
        'Realize.myContent',
        'Realize.assessment',
        'Realize.eText2Builder',
        'Realize.adaptiveHomework',
        'Realize.calendar',
        'Realize.core.security.permissions',
        'Realize.ui.modal.UnsavedChangesModal',
        'Realize.Discussions',
        'Realize.NbcLearn',
        'Realize.sidebar',
        'Realize.paths',
        'Realize.analytics',
        'Realize.Interceptors.SessionTimeout',
        'Realize.core.directives.htmlUnsafe',
        'realize.core.isoDateService',
        'realize.template-protection',
        'popover.templateOverride',
        'realize-lib.ui.disable-auto-attrs',
        'Realize.content.media-icon',
        'Realize.Content.customizedMessage',
        'Realize.reporting',
        'Realize.ui.scrollTopOnLoad',
        'Realize.assignment',
        'Realize.recommendation',
        'Realize.admin',
        'realize-lib.core.services.log',
        'Realize.user.currentUser',
        'Realize.classLanding',
        'Realize.classes.edit',
        'Realize.common.alerts',
        'Realize.common.ltiContentViewerDirective',
        'Realize.common.coTeachersAlert',
        'Realize.common.keyboardSupport.keyCodes',
        'Realize.common.dateFilterDecorator',
        'Realize.common.helpers',
        'Realize.common.keyStore',
        'Realize.common.browserInfoService',
        'Realize.common.mediaQueryService',
        'Realize.common.paginator',
        'Realize.common.adaptiveIconDirective',
        'Realize.common.realizeReaderSelectionIconDirective',
        'Realize.common.teacherIconDirective',
        'Realize.common.toolTipSupport.keyboardAccess',
        'Realize.common.optionalFeaturesService',
        'Realize.header',
        'Realize.navigationService',
        'Realize.prompts',
        'Realize.resources',
        'Realize.heartbeat',
        'Realize.teacher.profile',
        'Realize.student.profile',
        'Realize.search.telemetry',
        'Realize.constants.googleClassroom',
        'Realize.webStorage.storageDecorator',
        'components.assignmentFacade',
        'components.analytics',
        'components.breadCrumb',
        'components.eventInterceptor',
        'rlzComponents.components.banner',
        'rlzComponents.breadcrumbTelementryModule',
        'rlzComponents.components.rubricSidePanel',
        'rlzComponents.components.playlist',
        'rlzComponents.components.googleClassroom',
        'rlzComponents.components.browseAll',
        'rlzComponents.components.services.playlist',
        'rlzComponents.components.playlistTelemetryService',
        'rlzComponents.utilities.routeChangeWatchService',
        'whitelist.url.tracker',
        'rlzComponents.components.telemetryService',
        'rlzComponents.components.penpalModule',
        window.Components.default
    ])
    .config(['$windowProvider', 'currentUserProvider', function($windowProvider, currentUserProvider) {
        'use strict';
        var $window = new $windowProvider.$get();
        currentUserProvider.setPreloadData($window.currentUser);
    }])
    .constant('DISTANT_FUTURE_DATE', 9999999999999)
    .constant('QL_MAX_LINKS', 3)
    .constant('OPEN_ED_LINKS', {
        'OPEN_ED':'https://www.opened.com/',
        'TIPS': 'https://help.learningservicestechnology.com' +
                '/realize/en/Instructor/Content/Instructor' +
                '/Programs/programs_explore_program_pages.htm?cshid=1001'
    })
    // in the student and teacher test report, some assignments do not have associated program names
    .constant('CODE_ASSIGNMENT_HAS_NO_PROGRAM', 'NO_PROGRAM')
    .constant('HEADER_HEIGHT', 45)
    .constant('TEACHER_RESOURCES_DRAWER', 'teacherResourceDrawerOpen_')
    .constant('COLORS', {
        // colors as defined in variables.less
        BLUE_DARK: '#004168',
        GREEN: '#68a51a',
        BLUE: '#026ecb',
        RED_DARK: '#9e0b0f',
        GREEN_DARK: '#416b0c',
        BLUE_DARKEST: '#003250',
        RED_DARKER: '#6c090c',
        BLUE_DARKER: '#003766',
        BLUE_LIGHT: '#0189ff',
        YELLOW_LIGHT: '#fdd03a',
        RED_LIGHT: '#ed5932',
        BLACK: '#000000'
    })
    .constant('TOC_TITLE_LIMITS', {
        DEFAULT_LIMIT: 75,
        DEFAULT_SIDEBAR_LIMIT: 55,
        MOBILE_IMODE_LIMIT: 60,
        MOBILE_IMODE_SIDEBAR_LIMIT: 40
    })
    .constant('uiDateConfig', {
        prevText: '&#xf0d9;',
        nextText: '&#xf0da;'
    })
    .value('LOG_LEVEL', window.jsLogLevel)
    .run([
        'whitelistURLTrackerService',
        'telemetryService',
        'baseTelemetryEvents',
        function(whitelistURLTrackerService, telemetryService, baseTelemetryEvents) {
            'use strict';
            whitelistURLTrackerService.validateUrls().then(function(result) {
                var WHITELIST_VERB_ID = 'Verify',
                    urlsChecked = result.urlsChecked;
                if (urlsChecked.length) {
                    var telemetryUrlArry = [];
                    var overallStatus = 'SUCCESS';
                    for (var index = 0 ; index < urlsChecked.length; index++) {
                        var responseObj = urlsChecked[index];
                        var obj = {
                            url: responseObj.url,
                            code: responseObj.status,
                            msg: responseObj.statusText
                        };
                        if (responseObj.status < 200 || responseObj.status > 299) {
                            overallStatus = 'FAILURE';
                        }
                        telemetryUrlArry.push(obj);
                    }
                    var whitelistStr = JSON.stringify({
                        urlsChecked: telemetryUrlArry
                    });
                    var telemetryObject = {
                        extensions: {
                            whitelistresult: overallStatus,
                            whitelistdetails: whitelistStr
                        }
                    };
                    var activityDetails = baseTelemetryEvents.createEventData(WHITELIST_VERB_ID, telemetryObject);
                    telemetryService.sendTelemetryEvent(activityDetails);
                }
            });
        }])
    .run([
        '$currentUser',
        'lkGoogleSettings',
        function($currentUser, lkGoogleSettings) {
            'use strict';
            var userLocale = $currentUser.getAttribute('profile.locale'),
                isUXFAjax = false,
                fileList;
            lkGoogleSettings.locale = userLocale;
            moment.locale(userLocale);
            UXF.Common.i18n.load(userLocale, fileList, isUXFAjax);
        }
    ])
    .run([
        '$location',
        '$rootScope',
        '$http',
        'Modal',
        'SessionTimeoutModal',
        '$log',
        '$window',
        '$document',
        'webStorage',
        'PATH',
        'KeyStore',
        'AccessibilityService',
        'Content',
        'ClassRoster',
        'Permissions',
        'Analytics',
        'NBC_PROGRAM_NAME',
        '$currentUser',
        'BrowserInfo',
        'heartbeatApiService',
        'lwcI18nFilter',
        'RealizeHelpers',
        'googleClassroomService',
        'routeChangeWatchService',
        'featureManagementService',
        'penpalService',
        'telemetryService',
        'baseTelemetryEvents',
        function($location, $rootScope, $http, Modal, SessionTimeout, $log, $window, $document, webStorage, PATH,
            KeyStore, A11y, Content, ClassRoster, Permissions, Analytics, NBC_PROGRAM_NAME, $currentUser, BrowserInfo,
            heartbeatApiService, lwcI18nFilter, RealizeHelpers, googleClassroomService, routeChangeWatchService,
            featureManagementService, penpalService, telemetryService, baseTelemetryEvents) {
            'use strict';

            var iosKeyboardFocusHandler,
                iosKeyboardBlurHandler;

            if (!!window.heartbeatFeatureEnabled) {
                $log.info('heartbeat started');
                heartbeatApiService.sendHeartbeatEvent(true);
            }

            function clearStoarageAndLogout() {
                webStorage.clear();
                $location.path('/logout');
            }

            function validateUserIdentity(next, current) {
                var identityId = webStorage.session.get('StandardInfo-profile.identityId');
                if (identityId && $currentUser.userId !== identityId) {
                    var userInfoObject = {
                        extensions: {
                            dashboardUserId: identityId,
                            realizeUserId: $currentUser.userId,
                            current: { path: next.$$route.originalPath, params: next.params },
                        }
                    };
                    if (current) {
                        userInfoObject.extensions.prev = {
                            path: current.$$route.originalPath,
                            params: current.params
                        };
                    }
                    var activityDetails = baseTelemetryEvents.createEventData('wrongUserIdentityDetected',
                        userInfoObject);
                    telemetryService.sendTelemetryEvent(activityDetails);
                    var modalScope = $rootScope.$new();
                    modalScope.title = lwcI18nFilter('wrongUserAlertPopUp.title');
                    modalScope.body = lwcI18nFilter('wrongUserAlertPopUp.message');
                    modalScope.buttons = [{
                        title: lwcI18nFilter('wrongUserAlertPopUp.action.continue'),
                        isDefault: true,
                        clickHandler: function() {
                            Modal.hideDialog();
                            modalScope.$destroy();
                            clearStoarageAndLogout();
                        },
                    }];
                    modalScope.closeBtnClickHandler = function() {
                        Modal.hideDialog();
                        modalScope.$destroy();
                        clearStoarageAndLogout();
                    };
                    Modal.showDialog('templates/partials/simpleDialog.html', modalScope);
                }
            }
            $rootScope.currentUser = $currentUser;

            var dataLayer = $window.dataLayer || [];
            dataLayer.push({
                event: 'Login_event',
                userId: $currentUser.userId,
                baseApp: 'Realize_core',
            });

            function showGoogleConsentPopup() {
                var isGoogleConsentDenied = $location.search().isConsentDenied;
                var googleImportedUser = $rootScope.currentUser.getAttribute('googleImportedUser');
                var isAutoRostered = $rootScope.currentUser.getAttribute('isAutoRostered');
                var isClassLinkingEnabled = $rootScope.currentUser.getAttribute('isClassLinkingEnabled');
                var isBelongsToLinkedClass = $rootScope.currentUser.getAttribute('isBelongsToLinkedClass');
                if ($currentUser.isStudent && featureManagementService.isGoogleClassroomEnabledForStudent() &&
                    featureManagementService.isGoogleClassroomEnabled() &&
                    isAutoRostered && isClassLinkingEnabled && isBelongsToLinkedClass && !isGoogleConsentDenied) {
                    linkToGoogleAccountsPopUp();
                } else if ($currentUser.isStudent && googleImportedUser && !isGoogleConsentDenied &&
                    featureManagementService.isGoogleClassroomEnabled()) {
                    linkToGoogleAccountsPopUp();
                } else if ($currentUser.isTeacher && featureManagementService.isGoogleClassroomEnabled() &&
                    isAutoRostered && isClassLinkingEnabled && isBelongsToLinkedClass && !isGoogleConsentDenied) {
                    linkToGoogleAccountsPopUp();
                }
            }

            function linkToGoogleAccountsPopUp() {
                var userMappingQuery = googleClassroomService.getUserMappingQuery();
                googleClassroomService.setIsConsentCSSCallMade(true);
                googleClassroomService.classSyncServiceQuery(userMappingQuery)
                    .then(function(successResponse) {
                        var userMapping = successResponse.data.userMapping;
                        if (userMapping && userMapping.hasProvidedConsent && userMapping.hasValidToken) {
                            googleClassroomService.setGoogleConsentAsked(true);
                        } else {
                            modalPopUp();
                        }
                    })
                    .catch(function(error) {
                        $log.error('error', error);
                        modalPopUp();
                    });
            }

            function modalPopUp() {
                var url = PATH.REST + '/users/googleconsentscreen?consentScreenStatus=true';
                $http.post(url)
                    .then(function(response) {
                        $log.info('Google consent will not be asked again');
                        return response;
                    }, function(err) {
                        $log.error('Error setting dont consent popup', err);
                        return err;
                    });
                var modalScope = $rootScope.$new();
                modalScope.closeBtnClickHandler = function() {
                    googleClassroomService.setGoogleConsentAsked(true);
                    Modal.hideDialog();
                    modalScope.$destroy();
                };
                modalScope.title = lwcI18nFilter('googleClassroom.bannerTitle');
                modalScope.body = $currentUser.isTeacher ?
                    lwcI18nFilter('googleClassroom.linkAccountsPopup.teacherMessage') :
                    lwcI18nFilter('googleClassroom.linkAccountsPopup.message');
                if ($currentUser.getUserTheme() === 'EarlyLearner') {
                    modalScope.body = lwcI18nFilter('googleClassroom.linkAccountsPopup.earlyLearnerMessage');
                }
                modalScope.buttons = [{
                    title: lwcI18nFilter('googleClassroom.linkAccountsPopup.cancel'),
                    isDefault: false,
                    clickHandler: Modal.cancelGoogleDialog
                },
                {
                    title: lwcI18nFilter('googleClassroom.linkAccountsPopup.linkAccount'),
                    isDefault: true,
                    clickHandler: Modal.redirectToClassSyncWebapp
                }];
                Modal.showDialog('templates/partials/simpleDialog.html', modalScope);
            }

            $rootScope.isNbcLearnUser = function() { //TODO: move this into User
                return $rootScope.currentUser.$isSubscribedTo(NBC_PROGRAM_NAME);
            };

            $rootScope.getMessage = function(code, interpolationData, asArray) {
                return lwcI18nFilter(code, interpolationData, asArray);
            };

            $rootScope.servicesState = $window.servicesState;

            $rootScope.hasCommentFeature = function() {
                return $rootScope.servicesState['comments.feature.enabled'] === 'true';
            };

            $rootScope.indexBodyClass = function() {
                return {
                    'show-subnav': $rootScope.subnavState === 'titleOnly',
                    'show-subnav-menu': $rootScope.subnavState === 'hasMenu',
                    'hide-platform': $rootScope.hidePlatform,
                    'preview-mode': $rootScope.currentUser.getAttribute('admin.previewMode'),
                    'isSafari': BrowserInfo.browser.isSafari,
                    'isAndroid': BrowserInfo.OS.isAndroid,
                    'isIDevice': BrowserInfo.isIDevice,
                    'iosKeyboardOpen': $rootScope.iosKeyboardOpen,
                    'isReviewer': $rootScope.currentUser.isReviewer,
                    'altBkgd': $currentUser.isNbcLearnUser() && $rootScope.currentUser.isTeacher,
                    'is-customer-admin': $rootScope.currentUser.isCustomerAdmin,
                    'assessmentEditDeeplink': editAssessmentDeeplinkPath() && !$rootScope.currentUser.isCustomerAdmin,
                };
            };

            $rootScope.getHeaderRole = function() {
                var isDashboardHeaderEnabled = featureManagementService.isShowDashboardAppEnabled();
                return isDashboardHeaderEnabled ? '' : 'banner' ;
            };

            var editAssessmentDeeplinkPath = function() {
                return $location.path().search(/\/deeplink\/assessment\/[a-z0-9\-]+\/[0-9]+\/edit$/) === 0;
            };

            // watch for iOS keyboard open
            if (BrowserInfo.isIDevice) {
                iosKeyboardFocusHandler = function() {
                    $rootScope.iosKeyboardOpen = true;
                };
                $document.on('focus', 'input, select, textarea', iosKeyboardFocusHandler);

                iosKeyboardBlurHandler = function() {
                    $rootScope.iosKeyboardOpen = false;
                };
                $document.on('blur', 'input, select, textarea', iosKeyboardBlurHandler);
            }

            $rootScope.viewLoading = true;

            $rootScope.pageLoading = function() {
                $rootScope.viewLoading = true;
            };

            $rootScope.pageLoaded = function() {
                $rootScope.viewLoading = false;
            };

            // http://jira.pearsoncmg.com/jira/browse/RGHT-3248 - avoid opening session timeout modal more than once
            // when multiple ajax calls receive 401 error. Multiple calls to open the Modal renders and incomplete modal

            $rootScope.sessionStorageClear = function() {
                webStorage.clear();
            };

            $rootScope.isIFramed = function() {
                return $window.location !== $window.parent.location;
            };

            $rootScope.httpSessionTimedOutReceived = false;
            var sessionModalStorageKey = 'realize.session.modal.presented';
            webStorage.session.remove(sessionModalStorageKey);
            $rootScope.$on('httpSessionTimedOut', function() {
                $log.info('RECEIVED httpSessionTimedOut event', $rootScope.httpSessionTimedOutReceived);
                if (false === $rootScope.httpSessionTimedOutReceived) {
                    $rootScope.httpSessionTimedOutReceived = true;
                    $rootScope.sessionStorageClear();
                    heartbeatApiService.stopHeartbeats();

                    // Do not show session timed out dialog when realize is iframed,
                    // instead send a SESSIONTIMEOUT post message to the parent app.
                    if ($rootScope.isIFramed()) {
                        penpalService.sendToParent('SESSIONTIMEOUT')
                            .catch(function(error) {
                                $log.error('error sending SESSIONTIMEOUT post message to parent: ', error);
                            });
                    } else {
                        webStorage.session.add(sessionModalStorageKey, true);
                        SessionTimeout.showDialog();
                    }
                }
            });

            routeChangeWatchService.initializeWatchersForRootScope();

            $rootScope.$on('$routeChangeStart', function(evt, next, current) {
                // check for assignmentViewer mode and lesson item
                $rootScope.pageLoading();
                Modal.hideDialog();
                validateUserIdentity(next, current);
                var isGoogleConsentAsked = $location.search().googleConsentAsked;
                if (isGoogleConsentAsked === 'true') {
                    googleClassroomService.setGoogleConsentAsked(true);
                }

                // hack: remove all tooltips
                $('.tooltip').remove();

                // hack: close all drop-downs to prevent them from staying open after navigation on iPad
                $('.dropdown.open').removeClass('open');

                $.datepicker._hideDatepicker();
                if (!googleClassroomService.getGoogleConsentAsked() && $location.path() !== '/' &&
                    !googleClassroomService.getIsConsentCSSCallMade() && $location.path().search('/deeplink/') < 0) {
                    showGoogleConsentPopup();
                }

                if ($rootScope.currentUser.getAttribute('profile.wizard') !== 'complete' &&
                    !$rootScope.currentUser.isLtiAUser && !$rootScope.currentUser.isCustomerAdmin) {
                    $log.log('[$routeChangeStart] aborted. wizard incomplete. ');
                    $location.path('/welcome');
                }
                // Temporary placeholder for the purpose of POC to send the user details
                // & tracking to aptrinsic a.k.a Gainsight.
                // aptrinsic('identify',
                //    {
                //        'id': $rootScope.currentUser.userId, // Required for logged in app user
                //        'firstName': $rootScope.currentUser.firstName,
                //        'lastName': $rootScope.currentUser.lastName,
                //        'primary_organization_id': $rootScope.currentUser.primaryOrgId,
                //        'user_role': $rootScope.currentUser.primaryOrgRole
                //    },
                //    {
                //        'id':'SAVVAS Learning Company', //Required
                //        'name':'Realize Local'
                //    });
            });

            $rootScope.$on('$routeChangeSuccess', function() {
                $rootScope.pageLoaded();
            });

            var displayRouteErrorModal = function(errorMsg) {
                var modalScope = $rootScope.$new();
                modalScope.title = 'Something went wrong!';
                modalScope.body = 'We\'re sorry, we were unable to process your request because: ' + errorMsg;
                modalScope.closeBtnClickHandler = Modal.hideDialog;
                modalScope.buttons = [{
                    title: 'OK',
                    isDefault: true,
                    clickHandler: Modal.hideDialog
                }];
                Modal.showDialog('templates/partials/simpleDialog.html', modalScope);
            };

            $rootScope.$on('$routeChangeError', function(event, current, previous, rejection) {
                $rootScope.pageLoaded();

                $log.warn('ROUTE CHANGE ERROR', event, current, previous, rejection);

                // rejection can be an error message or a complex object
                if (angular.isString(rejection)) {
                    rejection = {
                        type: 'back',
                        errorMessage: rejection
                    };
                }

                // these types are defined by us
                if (rejection.type === 'redirect') {
                    // rejection data tells us where to go...
                    $log.warn('ROUTE REDIRECT ORDER ', rejection.path);
                    $location.path(rejection.path).replace();
                } else if (rejection.type === 'back') {
                    // default is to show error message if available and the go back to prev page.
                    if (rejection.errorMessage) {
                        displayRouteErrorModal(rejection.errorMessage);
                    }

                    // revert path
                    if (previous && previous.path) {
                        $location.path(previous.path);
                    } else if (rejection.useBack) {
                        event.currentScope.back();
                    }
                }

                // NOTE: any other type of rejection will only have the console warning
            });

            //TODO: is this still true? plus we need a student condition?

            // used to apply 'hide-platform' class to body (hides header and footer)
            // for pages like Content Viewer and Teacher Profile Wizard
            $rootScope.hidePlatform = false;
            $rootScope.hideFooter = false;
            // allow various subnav files access to path data for inner tab highlighting
            $rootScope.location = $location;

            $rootScope.$watch('location.path()', function(path, old) {
                $log.log('path watch', path, old);

                var pathName = path.split('/')[1];
                // site section applied to body (tab)
                $rootScope.siteSection = 'section-' + pathName;

                // adding 'section-search' class for browseAll page as well as it reuses the search page styling.
                if (pathName === 'browseAll') {
                    $rootScope.siteSection = 'section-search';
                }

                if ($rootScope.siteSection === 'section-') {
                    $rootScope.siteSection = 'section-home';
                }
                // For applying student specific styling for class/assignment pages
                if ($rootScope.siteSection === 'section-classes' && path.split('/').length > 2 &&
                    $rootScope.currentUser.primaryOrgRole === 'Student') {
                    $rootScope.siteSection = 'section-classes student';
                }

                var subNavViewPath = PATH.TEMPLATE_CACHE + PATH.SUBNAV;

                //TODO: refactor this whole thing
                // search must be first so that other keywords don't get hits...
                if (path.search('/search') >= 0 &&
                    path.search('/content/') < 0 &&
                    path.search('/standards/') < 0 &&
                    path.search('/assessment/') < 0 &&
                    path.search('/leveledreaders') < 0 &&
                    path.search('/playlist') < 0) {

                    $rootScope.subnavState = 'titleOnly';
                    $rootScope.subNavTemplate = subNavViewPath + 'searchSubnav.html';
                    $rootScope.hidePlatform = false;
                } else if (path.search('/standards') >= 0 && path.search('/content/') < 0 && path.search(
                        '/review/') >= 0) {
                    $rootScope.subnavState = 'titleOnly';
                    $rootScope.subNavTemplate = subNavViewPath + 'programSubnav.html';
                    $rootScope.hidePlatform = false;
                } else if (path.search('/standards') >= 0 && path.search('/content/') < 0 && path.search(
                        '/data') < 0) {
                    if (path.match(/assessment\/[a-z0-9\-]+\/[0-9]+\/edit$/)) {
                        $rootScope.subnavState = 'hidden';
                    } else {
                        $rootScope.subnavState = 'hasMenu';
                        $rootScope.subNavTemplate = subNavViewPath + 'programSubnav.html';
                        $rootScope.hidePlatform = false;
                    }
                } else if (path.match(/\/remediation$/) && path.search('/myLibrary') >= 0) {
                    $rootScope.subnavState = 'titleOnly';
                    $rootScope.subNavTemplate = subNavViewPath + 'myLibrarySubnav.html';
                    $rootScope.hidePlatform = false;
                } else if (path.match(/\/remediation$/)) {
                    if (path.search('/search') >= 0 || path.search('/browseAll') >= 0) {
                        $rootScope.subnavState = 'hidden'; //Hide subnav if came from search result
                    } else {
                        $rootScope.subnavState = 'hasMenu';
                    }
                    $rootScope.hidePlatform = false;
                    $rootScope.subNavTemplate = subNavViewPath + 'programSubnav.html';
                } else if (path.search('/content/') >= 0 &&
                        path.search('/manualScore/') < 0 &&
                        path.search('/discussPrompt/') < 0 &&
                        path.search('/adaptivehomework/') < 0) {
                    $rootScope.subnavState = 'hidden';
                    $rootScope.hidePlatform = true;
                } else if (path.match(/\/edit\/preview$/)) {
                    // assessment builder preview page
                    $rootScope.subnavState = 'hidden';
                    $rootScope.hidePlatform = true;
                } else if (path.match(/\/search\/assessment\/[a-z0-9\-]+\/[0-9]+\/edit$/)) {
                    $rootScope.subnavState = 'hidden';
                    $rootScope.hidePlatform = false;
                } else if (path.match(/\/deeplink\/assessment\/[a-z0-9\-]+\/[0-9]+\/edit$/) &&
                    $currentUser.isCustomerAdmin) {
                    $rootScope.subnavState = 'hidden';
                    $rootScope.hidePlatform = false;
                } else if (path.match(/\/deeplink\/assessment\/[a-z0-9\-]+\/[0-9]+\/edit$/)) {
                    $rootScope.subnavState = 'hasMenu';
                    $rootScope.subNavTemplate = subNavViewPath + 'programSubnav.html';
                    $rootScope.hidePlatform = false;
                } else if (path.match(/\/deeplink\/myLibrary\/program\/[a-z0-9\-]+\/[0-9]/) &&
                    path.match(/assessment\/[a-z0-9\-]+\/[0-9]+\/addQuestionBank$/)) {
                    $rootScope.subnavState = 'hidden';
                    $rootScope.hidePlatform = false;
                } else if (path.match(/\/myLibrary\/assessment\/[a-z0-9\-]+\/[0-9]+\/edit$/) &&
                    !path.match(/\/deeplink\/myLibrary\/assessment\/[a-z0-9\-]+\/[0-9]+\/edit$/)) {
                    $rootScope.subnavState = 'titleOnly';
                    $rootScope.subNavTemplate = subNavViewPath + 'myLibrarySubnav.html';
                    $rootScope.hidePlatform = false;
                } else if (path.match(/\/deeplink\/myLibrary\/assessment\/[a-z0-9\-]+\/[0-9]+\/edit$/)) {
                    $rootScope.subnavState = 'hidden';
                    $rootScope.hidePlatform = false;
                } else if ((path.search('/myLibrary/lesson') >= 0) || (path.search('/myLibrary/tier') >= 0) ||
                    path.search('/myLibrary/file') === 0 || path.search('/myLibrary/link') === 0 ||
                    path.search('/myLibrary/essayPrompt') === 0 || path.search('/myLibrary/assessment/essay') === 0 ||
                    path.search('/myLibrary/assessment/create') === 0) {
                    if (!featureManagementService.isMyLibraryViewerEnabled()) {
                        $rootScope.subnavState = 'titleOnly';
                        $rootScope.subNavTemplate = subNavViewPath + 'myLibrarySubnav.html';
                    }
                    $rootScope.hidePlatform = false;
                } else if (path.match(/assessment\/[a-z0-9\-]+\/[0-9]+\/edit$/)) {
                    if (path.match(/\/deeplink\/myLibrary\/program\/[a-z0-9\-]+\/[0-9]/)) {
                        $rootScope.subnavState = 'hidden';
                        $rootScope.hidePlatform = false;
                    } else if (path.match(/\/myLibrary\/program\/[a-z0-9\-]+\/[0-9]/)) {
                        $rootScope.subnavState = 'titleOnly';
                        $rootScope.subNavTemplate = subNavViewPath + 'myLibrarySubnav.html';
                    } else {
                        $rootScope.subnavState = 'hasMenu';
                        $rootScope.subNavTemplate = subNavViewPath + 'programSubnav.html';
                    }
                    $rootScope.hidePlatform = false;
                    // jscs:disable maximumLineLength
                } else if (path.match(/\/deeplink\/myLibrary\/program\/[a-z0-9\-]+\/[0-9]+\/assessment\/[a-z0-9\-]+\/[0-9]+\/addQuestionBank\/insert\/[a-z0-9\-]/)) {
                    $rootScope.subnavState = 'hidden';
                    $rootScope.hidePlatform = false;
                } else if (path.match(/\/myLibrary\/program\/[a-z0-9\-]+\/[0-9]/) &&
                    path.match(/assessment\/[a-z0-9\-]+\/[0-9]+\/addQuestionBank$/)) {
                    $rootScope.subnavState = 'titleOnly';
                    $rootScope.subNavTemplate = subNavViewPath + 'myLibrarySubnav.html';
                    $rootScope.hidePlatform = false;
                } else if (path.search('/program/') >= 0 && !$rootScope.currentUser.isStudent) {
                    $rootScope.subnavState = 'hasMenu';
                    $rootScope.subNavTemplate = subNavViewPath + 'programSubnav.html';
                    $rootScope.hidePlatform = false;
                } else if (path.search('/browseAll') >= 0 && path.search('/browseAll/playlist') < 0 &&
                    !$rootScope.currentUser.isStudent) {
                    $rootScope.subnavState = 'titleOnly';
                    $rootScope.subNavTemplate = subNavViewPath + 'browseAllContent.html';
                    $rootScope.hidePlatform = false;
                } else if (path.search('/program/') >= 0 && $rootScope.currentUser.isReviewer) {
                    $rootScope.subnavState = 'titleOnly';
                    $rootScope.subNavTemplate = subNavViewPath + 'programSubnav.html';
                    $rootScope.hidePlatform = false;
                } else if (path.search('/program/') >= 0 && $rootScope.currentUser.isStudent) {
                    $rootScope.subnavState = 'titleOnly';
                    $rootScope.subNavTemplate = subNavViewPath + 'programSubnav.html';
                    $rootScope.hidePlatform = false;
                } else if (path.search('/program') >= 0 && path.search('/program/') < 0 && path.search(
                        '/program-') < 0) {
                    $rootScope.subnavState = 'hidden';
                    $rootScope.hidePlatform = false;
                } else if (path.search('/centers/') >= 0) {
                    $rootScope.subnavState = 'titleOnly';
                    $rootScope.subNavTemplate = subNavViewPath + 'centersSubnav.ctrl.html';
                    $rootScope.hidePlatform = false;
                } else if (path.search('/centers') >= 0 && path.search('/centers/') < 0) {
                    $rootScope.subnavState = 'titleOnly';
                    $rootScope.subNavTemplate = subNavViewPath + 'centersLandingSubnav.html';
                    $rootScope.hidePlatform = false;
                } else if (path.search('/grades') >= 0 && path.search('/grades/') < 0) {
                    $rootScope.subnavState = 'hidden';
                    $rootScope.hidePlatform = false;
                } else if (path.search('/grades/') >= 0 && path.search('/overview') >= 0) {
                    $rootScope.subnavState = 'titleOnly';
                    $rootScope.subNavTemplate = subNavViewPath + 'gradesSubnav.ctrl.html';
                    $rootScope.hidePlatform = false;
                } else if (path.search('/classes') >= 0 && path.search('/classes/') < 0) {
                    $rootScope.subnavState = 'hidden';
                    $rootScope.subNavTemplate = subNavViewPath + 'classesListSubnav.html';
                } else if (path.search('/classes/') >= 0 &&
                        (path.search('/create') < 0 ||
                        path.search('/discussPrompt') >= 0 ||
                        path.search('/adaptivehomework') >= 0)) {
                    $rootScope.subnavState = 'hasMenu';
                    $rootScope.subNavTemplate = subNavViewPath + 'classesSubnav.ctrl.html';
                    $rootScope.hidePlatform = false;
                } else if (path.search('/classes/create/options') >= 0 ||
                    path.search('/error/no-programs-pageSource-data') >= 0) {
                    $rootScope.subnavState = 'titleOnly';
                    $rootScope.subNavTemplate = subNavViewPath + 'zeroStateClassGetStarted.html';
                    $rootScope.hidePlatform = false;
                } else if (path.search('/classes/') >= 0 && path.search('/discussPrompt') < 0 && path.search(
                        '/create') >= 0) {
                    $rootScope.hidePlatform = false;
                } else if (path.search('/data') >= 0 && path.search('/data/') < 0) {
                    $rootScope.subnavState = 'hidden';
                    // this says the same thing even though it's on data tab
                    $rootScope.subNavTemplate = subNavViewPath + 'classesListSubnav.html';
                } else if (path.search('/data/') >= 0 &&
                    (path.search('/overview') >= 0 ||
                        path.search('/standards') >= 0 ||
                        path.search('/scoreSummary') >= 0)) {

                    $rootScope.subnavState = 'hasMenu';
                    $rootScope.subNavTemplate = subNavViewPath + 'dataSubnav.ctrl.html';
                    $rootScope.hidePlatform = false;
                } else if (path.search('/admin') >= 0 && path.search('/admin/') < 0) {
                    $rootScope.subnavState = 'hasMenu';
                    $rootScope.subNavTemplate = subNavViewPath + 'adminSubnav.html';
                    $rootScope.hidePlatform = false;
                } else if (path.search('/admin/') >= 0 && path.search('/patools') > 0) {
                    $rootScope.subnavState = 'titleOnly';
                    $rootScope.subNavTemplate = subNavViewPath + 'adminPatoolsSubnav.html';
                    $rootScope.hidePlatform = false;
                } else if (path === '/') {
                    $rootScope.subnavState = 'hidden';
                    $rootScope.hidePlatform = false;
                } else if (path.search('/welcome') >= 0) {
                    $rootScope.subnavState = 'hidden';
                    $rootScope.hidePlatform = true;
                } else if ((path.search('/myLibrary/playlist') >= 0) ||
                    (path.search('/search/playlist') >= 0 || path.search('/browseAll/playlist') >= 0)) {
                    $rootScope.subnavState = 'hidden';
                    $rootScope.subNavTemplate = '';
                    $rootScope.hidePlatform = false;
                } else {
                    $rootScope.subnavState = 'hidden';
                    $rootScope.subNavTemplate = '';
                    $rootScope.hidePlatform = false;
                }

                if ((path.search('search') === -1) || (path.search('searchOpenEd') === -1)) {
                    $rootScope.keywords = null;
                }
            });

            // accessibility service
            A11y.init();
            A11y.setFocusElements(
                'a, button, input[type=file], input[type=radio], .sortableList, .customCheckbox [class*="icon-"]'
            );

            // use for storing data between views that isn't appropriate to store in a particular service
            // all keys should be namespaced
            $rootScope.keyStore = new KeyStore();

            //focused element is getting hidden behind title and sub nav in IE and Firefox
            //to avoid it below we are setting $(document).scrollTop to zero
            $('#pageWrap').on('focus', A11y.keyboardFocusableElements, function() {
                var focusedElement = $(this);
                window.setTimeout(function() {
                    if ($rootScope.isKeyboardInUse) {
                        var includeMargin = true,
                            offsetTop = focusedElement.offset().top,
                            scrollTop = $(document).scrollTop(),
                            headerHeight = $('#globalNav:visible').outerHeight(includeMargin) +
                            $('#sectionNav:visible').outerHeight(includeMargin);

                        if (($rootScope.subnavState === 'hasMenu' && (offsetTop - scrollTop) <
                                headerHeight) ||
                            ($rootScope.subnavState === 'titleOnly' && (offsetTop - scrollTop) <
                                headerHeight) ||
                            ($rootScope.subnavState === 'hidden' && (offsetTop - scrollTop) <
                                headerHeight)) {
                            $(document).scrollTop(0);
                        }
                    }
                }, 0);
            });

            $rootScope.goToDefaultErrorPage = function() {
                $location.path('/error/default');
            };

            $rootScope.$on('$destroy', function() {
                if (BrowserInfo.isIDevice) {
                    $document.off('focus', 'input, select, textarea', iosKeyboardFocusHandler);
                    $document.off('blur', 'input, select, textarea', iosKeyboardBlurHandler);
                }
            });

            $rootScope.$on('messages.locale.changed', function(e) {
                $log.debug('[RealizeApp] messages.locale.changed handler', e, arguments);
                RealizeHelpers.reloadWindow();
            });
            $rootScope.$on('user.locale.changed', function(e) {
                $log.debug('[RealizeApp] user.locale.changed handler', e, arguments);
                RealizeHelpers.reloadWindow();
            });
        }
    ]);

function removeFirstCharacter(inputString) {
    'use strict';
    return inputString.substr(1);
}

function getSearchParams(search) {
    'use strict';
    search = search || location.search;
    return removeFirstCharacter(search)
        .split('&')
        .reduce(
            function(currentValue, next) {
                var keyValueArray = next.split('='),
                    key = keyValueArray[0],
                    value = keyValueArray[1];
                currentValue[key] = angular.isUndefined(value) || value;
                return currentValue;
            },
            {});
}

angular.module('Realize.api', ['components.paths'])
    .constant('USE_MOCKS', USE_MOCKS)
    .config(['$windowProvider', 'PathsProvider', function($windowProvider, PathsProvider) {
        'use strict';
        var $window = new $windowProvider.$get();
        PathsProvider.setPaths({
            REST: $window.restPath,
            MEDIA: $window.rootPath + '/realizeit/componentArchitecture/dist',
        });
    }]);
