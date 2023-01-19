angular.module('Realize.header.mainNav', [
    'Realize.paths',
    'Realize.analytics',
    'Realize.content.model.contentItem',
    'Realize.content.model.openEdItem',
    'rlzComponents.components.i18n',
    'Realize.filters.ellipses',
    'Realize.user.currentUser',
    'Realize.common.mediaQueryService',
    'Realize.common.optionalFeaturesService',
    'Realize.constants.googleClassroom',
    'Realize.constants.partialsPaths',
    'rlzComponents.components.googleClassroom.constants',
    'rlzComponents.components.help.dialog',
    'rlzComponents.components.share.service',
    'rlzComponents.components.rbsToken',
    'Realize.navigationService',
])
    .constant('EXTERNAL_URLS', {
        TEACHER_HELP_URL: window.teacherHelpUrl,
        STUDENT_HELP_URL: window.studentHelpUrl,
        NEW_FEATURES_URL: window.newFeaturesUrl,
        TRAINING_LINK_URL: window.trainingLinkUrl,
        TECHNICAL_SUPPORT_LINK_URL: window.technicalsupportLinkUrl,
        CONTACT_PROGRAM_LINK_URL: window.contactProgramSpecialistLinkUrl,
        CUST_ADMIN_HELP_URL: window.custAdminHelpUrl
    })
    .directive('realizeMainNav', [
        'PATH',
        function(PATH) {
            'use strict';
            return {
                restrict: 'E',
                templateUrl: [PATH.TEMPLATE_CACHE, 'app/header/mainNav/mainNavTemplate.html'].join('/'),
                scope: {},
                controller: [
                    '$rootScope',
                    '$location',
                    '$currentUser',
                    '$sce',
                    '$window',
                    'lwcI18nFilter',
                    'MediaQuery',
                    'PATH',
                    'EXTERNAL_URLS',
                    'Content',
                    'OpenEdItem',
                    'Analytics',
                    '$routeParams',
                    'ContentSource',
                    '$route',
                    'MEDIA_PATH',
                    'BrowserInfo',
                    'OptionalFeatures',
                    'GOOGLE_CLASSROOM',
                    'searchTelemetryUtilitiesService',
                    'googleClassroomService',
                    'GoogleClassroomConstants',
                    'featureManagementService',
                    'browseLinkTelemetryService',
                    'helpMenuService',
                    'helpDialog',
                    'KEY_CODES',
                    '$timeout',
                    'shareService',
                    'rbsTokenService',
                    'NavigationService',
                    'navigationMenuItemFactory',
                    'locationUtilService',
                    function($rootScope, $location, $currentUser, $sce, $window, lwcI18nFilter, MediaQuery, PATH,
                        EXTERNAL_URLS, Content, OpenEdItem, Analytics, $routeParams,
                        ContentSource, $route, MEDIA_PATH, BrowserInfo, OptionalFeatures, GOOGLE_CLASSROOM,
                        searchTelemetryUtilitiesService, googleClassroomService, GoogleClassroomConstants,
                        featureManagementService, browseLinkTelemetryService, helpMenuService,
                        helpDialog, KEY_CODES, $timeout, shareService, rbsTokenService, NavigationService,
                        navigationMenuItemFactory, locationUtilService) {
                        var broadcastListenerDeregisterFns = [];
                        var templateUrls = {
                            desktop: PATH.COMPONENT + '/app/header/mainNav/mainNav.html',
                            smallTablet: PATH.COMPONENT + '/app/header/mainNav/mainNavSmallTablet.html',
                            celNavBar: PATH.COMPONENT + '/app/header/mainNav/celPlatformNavbar.html',
                            celMobileNavBar: PATH.COMPONENT + '/app/header/mainNav/celPlatformMobileNavbar.html'
                        };
                        var imagePath = MEDIA_PATH + '/skins/default/images/';
                        var nonRetinaImage = imagePath + 'realize_logo.png';
                        var retinaImage = imagePath + 'realize_logo@2x.png';
                        var searchImage = imagePath + 'search.svg';
                        var ctrl = this;
                        var lastViewedAt;
                        var timer;
                        var SIGNOUT_EVENT_ID = 'signOut',
                            ONLINE_HELP_EVENT_ID = 'onlineHelp',
                            NOTIFICATION_VIEW = 'notification';
                        var celNavBar;
                        var celMobileNavBar;
                        var MY_LIBRARY_PATH = '/myLibrary';
                        var PROGRAM_PATH = '/program';
                        var CLASSES_PATH = '/classes';
                        var newMessage;
                        var editedMessage;
                        var notificationDetails;

                        function setCelNavNotification(notificationDetails) {
                            newMessage = null;
                            editedMessage = null;
                            var notificationCount = notificationDetails.length;
                            var notificationTooltip;
                            var notificationMenuItem = navigationMenuItemFactory.getNotificationItems()[0];

                            var editedNotification = notificationDetails.filter(function(item) {
                                return item.edited && item.isItemViewed;
                            });
                            var newNotification = notificationDetails.filter(function(item) {
                                return !item.isItemViewed;
                            });
                            if (editedNotification) {
                                if (editedNotification.length > 1) {
                                    editedMessage =
                                    lwcI18nFilter('header.userNotification.editedItems.multipleItemsShared',
                                    [editedNotification.length]);
                                } else if (editedNotification.length === 1) {
                                    editedMessage =
                                    lwcI18nFilter('header.userNotification.editedItems.singleItemShared');
                                }
                            }
                            if (newNotification) {
                                if (newNotification.length > 1) {
                                    newMessage =
                                    lwcI18nFilter('header.userNotification.uneditedItems.multipleItemsShared',
                                    [newNotification.length]);
                                } else if (newNotification.length === 1) {
                                    newMessage =
                                    lwcI18nFilter('header.userNotification.uneditedItems.singleItemShared');
                                }
                            }
                            if (!editedNotification.length && !newNotification.length) {
                                newMessage = lwcI18nFilter('header.userNotification.zeroState');
                            }
                            if (!notificationCount) {
                                notificationTooltip = lwcI18nFilter('header.userNotification.noNotificationTitle');
                            } else {
                                var messageTranslation = lwcI18nFilter('header.userNotification.notificationTitle');
                                notificationTooltip = notificationCount + ' ' + messageTranslation;
                            }
                            var notificationData = {
                                a11yTitle: notificationTooltip,
                                title: notificationTooltip,
                                notificationCount: notificationCount,
                                notificationFirstMessage: newMessage,
                                notificationSecondMessage: editedMessage,
                                viewLinkLabel: lwcI18nFilter('header.userNotification.view')
                            };

                            var finalNotificationMsg = angular.merge(
                                {},
                                notificationMenuItem,
                                notificationData
                            );

                            if (celNavBar) {
                                celNavBar.notificationMessages = finalNotificationMsg;
                            }
                            if (celMobileNavBar) {
                                celMobileNavBar.notificationMessages = finalNotificationMsg;
                            }
                        }

                        function getSelectedMenuItem(id) {
                            var item = navigationMenuItemFactory.getAllItems()
                                .filter(function(item) {
                                    return item.id === id;
                                })[0];
                            return item;
                        }

                        function alreadyInMyLibraryViewer() {
                            return ctrl.location.path().search('/myLibrary') === 0 &&
                            ctrl.location.path().search('/myLibrary/') !== 0 &&
                            featureManagementService.isMyLibraryViewerEnabled();
                        }

                        var trackEvent = function(id) {
                            var menuItem = getSelectedMenuItem(id);
                            if (menuItem.track) {
                                Analytics.track('track.action', {
                                    category: menuItem.track.category,
                                    action: menuItem.track.action,
                                });
                            }
                        };

                        function handleNavigation(id) {
                            var menuItem = getSelectedMenuItem(id, menuItem);
                            var isStudent = ctrl.currentUser.hasRole('ROLE_STUDENT');
                            trackEvent(id);
                            var url = menuItem.url;
                            if (menuItem.openInNewTab) {
                                $window.open(url);
                            } else {
                                if (url === MY_LIBRARY_PATH && alreadyInMyLibraryViewer()) {
                                    $route.reload();
                                } else if (url === PROGRAM_PATH &&
                                    featureManagementService.isShowBrowseTopnavEnabled()) {
                                    redirectToDashboardUrl(url);
                                } else if (url === CLASSES_PATH &&
                                    featureManagementService.isShowClassesTopnavEnabled() && !isStudent) {
                                    redirectToDashboardUrl(url);
                                } else if (url === MY_LIBRARY_PATH &&
                                    featureManagementService.isShowMyLibraryTopnavEnabled()) {
                                    redirectToDashboardUrl(url);
                                } else {
                                    if (id === NOTIFICATION_VIEW) {
                                        NavigationService.navigateOutsideAngularContext(url);
                                    } else {
                                        NavigationService.navigate(url);
                                    }
                                }
                            }
                        }

                        function redirectToDashboardUrl(topNavName) {
                            var dashboardExternalURL = $window.location.protocol +
                                '//' + $window.location.hostname + '/dashboard' + topNavName;
                            NavigationService.navigateOutsideAngularContext(dashboardExternalURL);
                        }

                        ctrl.showSearchBox = function() {
                            return !featureManagementService.isCustomSearchEnabled();
                        };

                        function setHeaderTmplUrl() {
                            var isDeeplink = $location.path().includes('deeplink/');
                            var showCelNavbar = featureManagementService.isShowCelNavbarEnabled();
                            if (isDeeplink && $currentUser.isCustomerAdmin) {
                                ctrl.headerTmplUrl = MediaQuery.breakpoint.isSmallTablet ?
                                    templateUrls.celMobileNavBar : templateUrls.celNavBar;
                                ctrl.navbarClass = 'header__navbar_ca';
                            } else if (showCelNavbar) {
                                ctrl.headerTmplUrl = MediaQuery.breakpoint.isSmallTablet ?
                                    templateUrls.celMobileNavBar : templateUrls.celNavBar;
                                ctrl.navbarClass = $currentUser.isStudent ?
                                    'header__navbar_student' : 'header__navbar';
                            } else {
                                ctrl.headerTmplUrl = MediaQuery.breakpoint.isSmallTablet ?
                                    templateUrls.smallTablet : templateUrls.desktop;
                            }
                        }
                        function getUserNotification() {
                            lastViewedAt = $currentUser.getShareLastViewedAt();
                            if (!lastViewedAt) {
                                var lastViewedDate = new Date();
                                var pastYear = lastViewedDate.getFullYear() - 1;
                                lastViewedDate.setFullYear(pastYear);
                                lastViewedAt = lastViewedDate.toISOString();
                            }
                            shareService.getNewShareCountAfter(true, lastViewedAt)
                                .then(function(data) {
                                    timer = $timeout(function() {
                                        ctrl.notificationCount = data;
                                        var translation;
                                        if (!data) {
                                            translation = lwcI18nFilter('header.userNotification.noNotificationTitle');
                                            ctrl.notificationMessage = translation;
                                        } else {
                                            translation = lwcI18nFilter('header.userNotification.notificationTitle');
                                            ctrl.notificationMessage = data + ' ' + translation;
                                        }
                                        if (celNavBar || celMobileNavBar) {
                                            notificationDetails = data.data.sharesByUser;
                                            setCelNavNotification(notificationDetails);
                                        }
                                    }, 0);
                                });
                        }
                        var getShareLastViewedAtNewTime = $rootScope.$on('share.lastViewedAt.changed',
                            function() {
                            getUserNotification();
                        });

                        broadcastListenerDeregisterFns.push(getShareLastViewedAtNewTime);

                        ctrl.browse = function(location) {
                            this.location.path('/program');
                            this.location.search({});
                            if (location) {
                                browseLinkTelemetryService.sendTelemetryEvents(location);
                            }
                        };

                        function shouldOpenHelpDialog(menuName) {
                            return menuName === 'online_help' && !MediaQuery.breakpoint.isSmallTablet;
                        }

                        function shouldOpenHelpDialogAndSearch(detail) {
                            return detail.id === 'helpSearch' && !MediaQuery.breakpoint.isSmallTablet;
                        }

                        ctrl.getHelpUrl = function() {
                            var isStudent = ctrl.currentUser.hasRole('ROLE_STUDENT');
                            var isCustomerAdmin = ctrl.currentUser.hasRole('ROLE_CUSTOMER_ADMIN');
                            var cshid = helpMenuService.getCshId(isStudent);
                            var studentHelpUrl = ctrl.externalUrls.STUDENT_HELP_URL + '#cshid=' + cshid.codedCshId;
                            var teacherHelpUrl = ctrl.externalUrls.TEACHER_HELP_URL + '#cshid=' + cshid.codedCshId;
                            var customerHelpUrl = ctrl.externalUrls.CUST_ADMIN_HELP_URL + '#cshid=' + cshid.codedCshId;
                            var iframeSrc;
                            if (isStudent) {
                                iframeSrc = studentHelpUrl;
                            } else if (isCustomerAdmin) {
                                iframeSrc = customerHelpUrl;
                            } else {
                                iframeSrc = teacherHelpUrl;
                            }
                            // This log is used by Authering team for contextual help mapping.
                            // Will remove this console when mapping will done.
                            console.log('Generated cshid s ', cshid);
                            return $sce.trustAsResourceUrl(iframeSrc);
                        };

                        ctrl.callHelpMenuTelemetry = function(menuName) {
                            helpMenuService.sendTelemetryEvents(menuName, !this.currentUser.isTeacher);
                            if (shouldOpenHelpDialog(menuName)) {
                                setTimeout(function() {
                                    helpDialog.activate({
                                        cssClass: 'helpFloating__dialog',
                                        description: '',
                                        heading: lwcI18nFilter('header.helpDialog.help'),
                                        iframeSrc: ctrl.getHelpUrl(),
                                        path: $location.path().replace('/community/', ''),
                                        closeAction: function() {
                                            helpDialog.deactivate();
                                        }
                                    });
                                }, 0);
                            }
                        };

                        ctrl.callHelpMenuTelemetryAndSearch = function(detail, menuName) {
                            helpMenuService.sendTelemetryEvents(menuName, !this.currentUser.isTeacher);
                            if (shouldOpenHelpDialogAndSearch(detail)) {
                                var isStudent = ctrl.currentUser.hasRole('ROLE_STUDENT');
                                var isCustomerAdmin = ctrl.currentUser.hasRole('ROLE_CUSTOMER_ADMIN');
                                var param = encodeURIComponent(detail.searchValue);
                                var helpUrl;
                                if (isStudent) {
                                    helpUrl = ctrl.externalUrls.STUDENT_HELP_URL;
                                } else if (isCustomerAdmin) {
                                    helpUrl = ctrl.externalUrls.CUST_ADMIN_HELP_URL;
                                } else {
                                    helpUrl = ctrl.externalUrls.TEACHER_HELP_URL;
                                }
                                var url = helpUrl + '?q=' + param;
                                setTimeout(function() {
                                    helpDialog.activate({
                                        cssClass: 'helpFloating__dialog',
                                        description: '',
                                        heading: lwcI18nFilter('header.helpDialog.help'),
                                        iframeSrc: $sce.trustAsResourceUrl(url),
                                        path: $location.path().replace('/community/', ''),
                                        closeAction: function() {
                                            helpDialog.deactivate();
                                        }
                                    });
                                }, 0);
                            }
                        };

                        ctrl.onEnter = function(event, menuName) {
                            if (event.keyCode === KEY_CODES.ENTER) {
                                if (menuName === 'program_training') {
                                    ctrl.callHelpMenuTelemetry(menuName);
                                    $window.open(ctrl.externalUrls.TRAINING_LINK_URL);
                                } else if (menuName === 'technical_support') {
                                    ctrl.callHelpMenuTelemetry(menuName);
                                    $window.open(ctrl.externalUrls.TECHNICAL_SUPPORT_LINK_URL);
                                } else if (menuName === 'contact_program_specialist') {
                                    ctrl.callHelpMenuTelemetry(menuName);
                                    $window.open(ctrl.externalUrls.CONTACT_PROGRAM_LINK_URL);
                                }
                            }
                        };
                        ctrl.navigateToSharedwithme = function() {
                            var sharedwithmeUrl = '/myLibrary/sharedwithme';
                            ctrl.location.path(sharedwithmeUrl);
                        };

                        ctrl.search = function(keywords) {
                            var resourcesPath,
                                searchProvider,
                                alreadyInResources;
                            if (keywords) {
                                if (keywords === '.' || keywords === '-') {
                                    keywords = '';
                                }
                                if (!!ctrl.searchThisProgramChecked) {
                                    searchProvider = new ContentSource(ContentSource.getByPath());
                                    searchProvider.filterData.set('resources.search.keyword', keywords);
                                    alreadyInResources = $location.path().indexOf('/resources') >= 0;
                                    if (alreadyInResources) {
                                        $route.reload();
                                    } else {
                                        resourcesPath = [
                                            '/program', $routeParams.programId, $routeParams.programVersion, 'resources'
                                        ].join('/');
                                        NavigationService.navigate(resourcesPath);
                                    }
                                    return;
                                }
                                Content.filterData.empty(); //Fresh keyword search
                                OpenEdItem.filterData.empty();
                                $location.path('/search').search({
                                    'keywords': keywords
                                });
                                Analytics.track('track.action', {
                                    category: 'Search',
                                    action: 'Keyword (' + keywords + ')'
                                });
                                searchTelemetryUtilitiesService.sendTelemetryEventsFromSearchButton(keywords);
                            }
                        };

                        ctrl.inProgramsTab = function() {
                            var programPath = $location.path().split('/program')[1];
                            if ($currentUser.isTeacher && programPath && programPath.length > 0) {
                                return true;
                            } else {
                                ctrl.searchThisProgramChecked = false;
                                return false;
                            }
                        };

                        ctrl.isGoogleClassroomFeatureEnabled = function() {
                            return featureManagementService.isGoogleClassroomEnabled();
                        };

                        ctrl.close = function(event) {
                            if (event.target.getAttribute('class') !== 'icon-remove-sign') {
                                event.stopPropagation();
                            }
                        };

                        ctrl.onTemplateLoaded = function() {
                            setPropertiesForCelPlatformNavbar();
                            setPropertiesForCelPlatformMobileNavbar();
                            if (!ctrl.showSearchBox()) {
                                var checkLoadedElements = setInterval(function() {
                                    if (celNavBar || celMobileNavBar) {
                                        clearInterval(checkLoadedElements);
                                        if (celNavBar) {
                                            loadSearchBox(celNavBar, false);
                                        }
                                        if (celMobileNavBar) {
                                            loadSearchBox(celMobileNavBar, true);
                                        }
                                    }
                                }, 1000);
                            }
                        };

                        function loadSearchBox(navBar, isMobile) {
                            var loadedShdowRoot = setInterval(function() {
                                var navBarChildElements = navBar.shadowRoot;
                                var findClass = isMobile ? '.navbar-mobile__right-container' :
                                '.platform__navbar--rightContainer';
                                var navBarChilNodes = navBarChildElements.childNodes;
                                if (navBarChilNodes.length) {
                                    clearInterval(loadedShdowRoot);
                                } else {
                                    return;
                                }
                                var rightContainerParent = Array.from(navBarChilNodes).find(function(i) {
                                    return i.querySelector(findClass);
                                });
                                var rightContainer = rightContainerParent.querySelector(findClass);
                                var searchLinkTemplate = document.querySelector('template');
                                rightContainer.insertBefore(searchLinkTemplate.content, rightContainer.childNodes[0]);
                                navBarChildElements.querySelector('#platform-navbar___search-icon').src = searchImage;
                                navBarChildElements.querySelector('#keywordSearch')
                                        .addEventListener('click', function() {
                                            redirectToDashboardUrl('/search');
                                        });
                            }, 1000);
                        }

                        ctrl.showSubNavigation = function() {
                            return !locationUtilService.isDeeplinkStudentAndGroupTabActive() && !locationUtilService
                            .isDeeplinkDiscussTabActive() && !locationUtilService.isDeeplinkDataTabActive() &&
                            !locationUtilService.isDeeplinkSearchActive();
                        };

                        var setPropertiesForCelPlatformNavbar = function() {
                            celNavBar = document.querySelector('cel-platform-navbar');

                            if (!celNavBar) { return; }

                            // Navigation Items
                            var navItems = navigationMenuItemFactory.getNavigationMenuItems();

                            celNavBar.navigationItems = navItems;

                            // Active Nav item
                            setActiveNavItemForCelPlatformNavbar();

                            // Logo Navigation Item
                            celNavBar.logoNavigationItem = navigationMenuItemFactory.getHomeLogoMenuItem()[0];

                            celNavBar.addEventListener('celPlatformNavbarItemSelected', function($event) {
                                handleNavigation($event.detail.id);
                                celNavBar.activeNavigationItemId = $event.detail.id;
                            });

                            celNavBar.addEventListener('celPlatformNavbarLogoSelected', function($event) {
                                handleNavigation($event.detail.id);
                            });

                            // User name and avatar menu
                            // var userNameArr = [$currentUser.firstName, $currentUser.lastName];
                            // var filteredUserName = _.filter(userNameArr,
                            //     function(data) { return data && data.length; });
                            celNavBar.userMenuLabel = $currentUser.firstName;
                            celNavBar.userAvatar = {iconPath: $currentUser.avatarUrl, iconAlt: 'avatar'};

                            // UserMenu Items Configuration
                            var userMenuItems = navigationMenuItemFactory.getUserMenuItems();
                            celNavBar.userMenuItems = userMenuItems;
                            celNavBar.helpSearchPlaceholder = lwcI18nFilter('browse.searchHelp');
                            //help menu items
                            var helpMenuItems = navigationMenuItemFactory.getHelpMenuItems();

                            //Tooltip
                            celNavBar.helpMenuItems = helpMenuItems;
                            var rightMenuTooltip = {
                                searchTitle : lwcI18nFilter('header.searchTool.title'),
                                helpTitle: $currentUser.isStudent ? lwcI18nFilter('header.nav.help') :
                                    lwcI18nFilter('header.nav.training'),
                                profileTitle: lwcI18nFilter('header.nav.profile')
                            };
                            celNavBar.rightMenuTooltip = rightMenuTooltip;

                            celNavBar.addEventListener('celDropdownMenuItemSelected', function($event) {
                                if ($event.detail === SIGNOUT_EVENT_ID) {
                                    ctrl.logoutUser();
                                } else if ($event.detail === ONLINE_HELP_EVENT_ID) {
                                    trackEvent($event.detail);
                                    ctrl.callHelpMenuTelemetry('online_help');
                                } else {
                                    if ($event.detail === NOTIFICATION_VIEW) {
                                        ctrl.currentUser.setShareLastViewedAt(new Date().toISOString());
                                    }
                                    handleNavigation($event.detail);
                                }
                            });

                            var HELP_SEARCH_INPUT = 'helpSearch';
                            var CLASSIC_SEARCH_INPUT = 'classicSearch';
                            var CONTENT_SEARCH = 'contentSearch';
                            celNavBar.addEventListener('searchSubmitEvent', function($event) {
                                if ($event.detail.id === HELP_SEARCH_INPUT) {
                                    ctrl.callHelpMenuTelemetryAndSearch($event.detail, 'online_help');
                                }
                                if ($event.detail.id === CLASSIC_SEARCH_INPUT) {
                                    ctrl.search($event.detail.searchValue);
                                }
                                if ($event.detail.id === CONTENT_SEARCH) {
                                    ctrl.searchThisProgramChecked = $event.detail.searchOnlyProgram;
                                    ctrl.search($event.detail.searchValue);
                                }
                            });

                            //search
                            if (!$currentUser.isCustomerAdmin && ctrl.showSearchBox()) {
                                celNavBar.enableSearch = true;
                                celNavBar.searchPlaceholder = lwcI18nFilter('header.search.label');
                            } else {
                                celNavBar.enableSearch = false;
                            }

                            //notifications
                            var isTeacher = !$currentUser.isCustomerAdmin && $currentUser.hasRole('ROLE_TEACHER');
                            if (isTeacher) {
                                setCelNavNotification([]); // set default count to 0 or empty array first
                                getUserNotification();
                            } else {
                                celNavBar.enableNotification = false;
                            }

                            //hide profile icon for customer admin
                            if ($currentUser.isCustomerAdmin) {
                                celNavBar.showUserAvatar = false;
                            }

                            addPlatformHeaderClassToSectionBody();
                        };

                        var setActiveNavItemForCelPlatformNavbar = function() {
                            celNavBar = document.querySelector('cel-platform-navbar');
                            if (!celNavBar) {
                                return;
                            }
                            var navigationMenuItems = navigationMenuItemFactory.getNavigationMenuItems();
                            var matchedItemFound;
                            var locationPath = $location.path();
                            if (locationPath.startsWith('/browseAll')) {
                                locationPath = '/program';
                            }
                            if (locationPath.startsWith('/deeplink/myLibrary')) {
                                locationPath = '/myLibrary';
                            }
                            for (var index = 0; index < navigationMenuItems.length; index++) {
                                var navMenuItem = navigationMenuItems[index];
                                if (locationPath.startsWith('/' + navMenuItem.id)) {
                                    celNavBar.activeNavigationItemId = navMenuItem.id;
                                    matchedItemFound = true;
                                    break;
                                }
                            }
                            if (!matchedItemFound) {
                                celNavBar.activeNavigationItemId = null;
                            }
                        };

                        var setPropertiesForCelPlatformMobileNavbar = function() {
                            celMobileNavBar = document.querySelector('cel-platform-mobile-navbar');

                            if (!celMobileNavBar) { return; }

                            // Mobile Notification
                            var isTeacher = !$currentUser.isCustomerAdmin && $currentUser.hasRole('ROLE_TEACHER');
                            if (isTeacher) {
                                setCelNavNotification([]); // set default count to 0 or empty array first
                                getUserNotification();
                            } else {
                                celMobileNavBar.enableNotification = false;
                            }

                            // Navigation Items
                            var navItems = navigationMenuItemFactory.getNavigationMenuItems();

                            celMobileNavBar.navigationItems = navItems;

                            // Logo Navigation Item
                            celMobileNavBar.logoNavigationItem = navigationMenuItemFactory.getHomeLogoMenuItem()[0];
                            celMobileNavBar.addEventListener('celPlatformNavbarLogoSelected', function($event) {
                                handleNavigation($event.detail.id);
                            });
                            //help menu items
                            var helpMenuItems = navigationMenuItemFactory.getHelpMenuItems();
                            celMobileNavBar.helpMenuItems = helpMenuItems;

                            celMobileNavBar.addEventListener('celPlatformNavbarItemSelected', function($event) {
                                var menuId = $event.detail.id;
                                if (menuId === SIGNOUT_EVENT_ID) {
                                    ctrl.logoutUser();
                                } else if (menuId === ONLINE_HELP_EVENT_ID) {
                                    trackEvent(menuId);
                                    $window.open(ctrl.getHelpUrl());
                                } else {
                                    if (menuId === NOTIFICATION_VIEW) {
                                        ctrl.currentUser.setShareLastViewedAt(new Date().toISOString());
                                    }
                                    handleNavigation(menuId);
                                }
                            });

                            // UserName in menu
                            celMobileNavBar.userMenuLabel = filteredUserNames();
                            celMobileNavBar.userAvatar = {iconPath: $currentUser.avatarUrl, iconAlt: 'avatar'};

                            // UserMenu Items Configuration
                            var userMenuItems = navigationMenuItemFactory.getUserMenuItems();
                            celMobileNavBar.userMenuItems = userMenuItems;

                            celMobileNavBar.addEventListener('celDropdownMenuItemSelected', function($event) {
                                if ($event.detail === SIGNOUT_EVENT_ID) {
                                    ctrl.logoutUser();
                                } else {
                                    handleNavigation($event.detail);
                                }
                            });

                            var HELP_SEARCH_INPUT = 'helpSearch';
                            var CLASSIC_SEARCH_INPUT = 'classicSearch';
                            celMobileNavBar.addEventListener('searchSubmitEvent', function($event) {
                                if ($event.detail.id === HELP_SEARCH_INPUT) {
                                    ctrl.callHelpMenuTelemetryAndSearch($event.detail, 'online_help');
                                }
                                if ($event.detail.id === CLASSIC_SEARCH_INPUT) {
                                    ctrl.search($event.detail.searchValue);
                                }
                            });

                            //search
                            if (!$currentUser.isCustomerAdmin && ctrl.showSearchBox()) {
                                celMobileNavBar.enableSearch = true;
                                celMobileNavBar.searchPlaceholder = lwcI18nFilter('header.search.label');
                            } else {
                                celMobileNavBar.enableSearch = false;
                            }

                            //hide profile icon for customer admin
                            if ($currentUser.isCustomerAdmin) {
                                celMobileNavBar.showUserAvatar = false;
                                celMobileNavBar.showUserName = true;
                                celMobileNavBar.userMenuLabel = $currentUser.firstName;
                            }
                            addPlatformHeaderClassToSectionBody();
                        };
                        var filteredUserNames = function() {
                            return _.filter([$currentUser.firstName, $currentUser.lastName],
                                function(data) { return data && data.length; }).join(' ');
                        };
                        ctrl.externalUrls = EXTERNAL_URLS;
                        ctrl.currentUser = $currentUser;
                        ctrl.location = $location;

                        ctrl.homePageImage = BrowserInfo.isHDDisplay ? retinaImage : nonRetinaImage;

                        // My Library menu display check
                        ctrl.hasTeacherRole = ctrl.currentUser.isTeacher;
                        // check to activate the my library tab
                        ctrl.inMyLibraryTab = function() {
                            return ctrl.location.path().search('/myLibrary') === 0 ||
                                ctrl.location.path().search('/playlist') === 0;
                        };
                        // To navigate my library page
                        ctrl.launchMyLibrary = function() {
                            $location.search('lastSelectedGrade', null);
                            if (alreadyInMyLibraryViewer()) {
                                $route.reload();
                            } else {
                                ctrl.location.path('/myLibrary');
                            }
                        };

                        ctrl.logoutUser = function() {
                            $timeout(function() {
                                $location.path('/logout');
                            }, 0);
                        };

                        if ($currentUser.isTeacher) {
                            getUserNotification();
                        } else {
                            rbsTokenService.getToken();
                        }

                        setHeaderTmplUrl();

                        var windowBreakpointChangeWatcher = $rootScope.$on('window.breakpoint.change', function() {
                            setHeaderTmplUrl();
                        });

                        broadcastListenerDeregisterFns.push(windowBreakpointChangeWatcher);

                        var routeChangeWatcher = $rootScope.$on('$routeChangeSuccess', function() {
                            setActiveNavItemForCelPlatformNavbar();
                            if (celNavBar) {
                                celNavBar.showCheckbox = false;
                                if (ctrl.inProgramsTab()) {
                                    celNavBar.showCheckbox = true;
                                    celNavBar.checkboxLabel = lwcI18nFilter('header.search.checkbox.text');
                                }
                            }

                        });

                        broadcastListenerDeregisterFns.push(routeChangeWatcher);

                        $rootScope.$on('$destroy', function() {
                            _.forEach(broadcastListenerDeregisterFns, function(watchDestroyFn) {
                                watchDestroyFn();
                            });
                            $timeout.cancel(timer);
                        });

                        var addPlatformHeaderClassToSectionBody = function() {
                            var sectionBodyEl = document.querySelector('#sectionBody');
                            if (!sectionBodyEl || !$currentUser.isCustomerAdmin) { return; }
                            sectionBodyEl.classList.add('cel-platform-header');
                        };

                        var profileAvtarUpdatedEvent = $rootScope.$on('profile.avatar.updated', function() {
                            var updatedUserAvtar = {iconPath: $currentUser.avatarUrl, iconAlt: 'avatar'};
                            if (celNavBar) {
                                celNavBar.userAvatar = updatedUserAvtar;
                            }
                            if (celMobileNavBar) {
                                celMobileNavBar.userAvatar = updatedUserAvtar;
                            }
                        });
                        broadcastListenerDeregisterFns.push(profileAvtarUpdatedEvent);

                        var profileNamesUdatedEvent = $rootScope.$on('profile.names.updated', function() {
                            var updatedUserMenuLabel = $currentUser.firstName;
                            if (celNavBar) {
                                celNavBar.userMenuLabel = updatedUserMenuLabel;
                            }
                            if (celMobileNavBar) {
                                celMobileNavBar.userMenuLabel = filteredUserNames();
                            }
                        });
                        broadcastListenerDeregisterFns.push(profileNamesUdatedEvent);
                    }
                ],
                controllerAs: 'mainNavCtrl'
            };
        }
    ]);
