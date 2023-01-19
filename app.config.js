angular.module('RealizeApp.Config', [
    'ngRoute',
    'ModalServices',
    'Realize.user.currentUser',
    'RealizeDataServices',
    'Realize.paths',
    'Realize.Interceptors.SessionTimeout',
    'Realize.Interceptors.CSRFToken',
    'Realize.core.security.permissions',
    'Realize.common.mediaQueryService',
    'Realize.common.tokenRecovery',
    'Realize.common.optionalFeaturesService',
    'lk-google-picker',
    'Realize.comments',
    'rlzComponents.components.services.oneDrive'
])
    .config([
        'UserProvider',
        'MEDIA_PATH',
        '$currentUserProvider',
        '$compileProvider',
        '$locationProvider',
        '$routeProvider',
        '$httpProvider',
        '$provide',
        'SessionTimeoutServiceProvider',
        'CommonTokenRecoveryProvider',
        'PermissionsProvider',
        'MediaQueryProvider',
        'OptionalFeaturesProvider',
        'lkGoogleSettingsProvider',
        '$windowProvider',
        'oneDriveSettingsProvider',
        function configApp(UserProvider, MEDIA_PATH, $currentUserProvider, $compileProvider, $locationProvider,
                           $routeProvider, $httpProvider, $provide, SessionTimeoutServiceProvider,
                           CommonTokenRecoveryProvider, PermissionsProvider, MediaQueryProvider,
                           OptionalFeaturesProvider, lkGoogleSettingsProvider, $windowProvider,
                           oneDriveSettingsProvider) {
            'use strict';

            var triggerSessionTimeoutModal,
                nonFederated,
                federated,
                perms,
                appBreakpoints;

            UserProvider.setBaseAvatarImagePath(MEDIA_PATH + '/skins/default/images/profile_icons/');
            $currentUserProvider.setPreloadData(window.currentUser);

            $locationProvider.html5Mode(true);

            $httpProvider.interceptors.push('CommonTokenInterceptor');
            $httpProvider.interceptors.push('CSRFTokenInterceptor');

            // modify to allow for local file storage
            $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|file|tel|filesystem):/);
            $compileProvider.imgSrcSanitizationWhitelist(/^\s*(https?|ftp|mailto|file|tel|filesystem):/);

            triggerSessionTimeoutModal = [
                '$rootScope',
                '$q',
                function($rootScope, $q) {
                    return function($httpResponse) {
                        $rootScope.$broadcast('httpSessionTimedOut');
                        return $q.reject($httpResponse);
                    };
                }
            ];

            CommonTokenRecoveryProvider.setSessionTimeoutServiceProvider(SessionTimeoutServiceProvider);
            SessionTimeoutServiceProvider.addEventHandler(triggerSessionTimeoutModal);
            SessionTimeoutServiceProvider.addEventHandler('CommonTokenRecovery', 999);

            // global error pages
            $routeProvider.when('/error/:errorType', {
                controller: 'ErrorCtrl',
                templateUrl: 'templates/views/error.html'
            }).when('/dashboard', {
                template: '',
                controller: ['$window',
                    'featureManagementService',
                    'NavigationService',
                    '$routeParams',
                    function($window,
                        featureManagementService,
                        NavigationService,
                        $routeParams) {
                        if ($routeParams.oauth) {
                            var oauth = JSON.parse($routeParams.oauth);
                            if (oauth.clientId && oauth.clientId === $window.oneDriveAppId) {
                                // to skip dashboard viewer to open during one drive file picker flow
                                return;
                            }
                        }
                        if (featureManagementService.isShowDashboardAppEnabled()) {
                            var dashboardExternalURL = $window.location.protocol +
                                '//' + $window.location.hostname + '/dashboard/viewer';
                            NavigationService.navigateOutsideAngularContext(dashboardExternalURL);
                        } else {
                            NavigationService.navigate('/home');
                        }
                    }],
                resolve: {
                    Data: ['Resolve',
                        function(Resolve) {
                            return Resolve.isSessionValid();
                        }
                    ]
                }
            });

            nonFederated = ['$rootScope',
                function($rootScope) {
                    return !$rootScope.currentUser.isFederatedUser;
                }
            ];
            federated = ['$rootScope',
                function($rootScope) {
                    return $rootScope.currentUser.isFederatedUser;
                }
            ];

            perms = {
                create_class: nonFederated,
                edit_class: nonFederated,
                edit_class_in_SIS: federated,
                add_student: nonFederated,
                add_student_in_SIS: federated,
                edit_student: nonFederated,
                edit_profile: nonFederated,
                edit_profile_in_SIS: federated
            };

            PermissionsProvider.setPermissions(perms);

            appBreakpoints = {
                desktop: {
                    minWidth: 980
                },
                largeTablet: {
                    maxWidth: 979,
                    minWidth: 768
                },
                smallTablet: {
                    maxWidth: 767
                }
            };
            MediaQueryProvider.setBreakpoints(appBreakpoints);

            OptionalFeaturesProvider.setServicesState(window.servicesState);
            OptionalFeaturesProvider.updateServicesState('notebook.integration.enabled',
                window.realizeNotebookIntegrationEnabled);

            $provide.decorator('$rootScope', ['$delegate', function safeApplyDecorator($delegate) {
                //to avoid calling $digest or $apply inappropriately, use this
                //@param func {Function|undefined} If supplied, the function to run inside
                //  the current/next $apply/$digest cycle
                $delegate.safeApply = function safeApply(func) {
                    var phase = $delegate.$$phase;
                    if (['$apply', '$digest'].indexOf(phase) !== -1) {
                        if (func && angular.isFunction(func)) {
                            func();
                        }
                    } else {
                        $delegate.$apply(func);
                    }
                };

                return $delegate;
            }]);

            lkGoogleSettingsProvider.configure({
                features: [],
                clientId: $windowProvider.$get().googleClientId,
                views: ['DocsView().setIncludeFolders(true)']
            });

            var oneDriveOptions = {
                clientId: $windowProvider.$get().oneDriveAppId,
                action: 'share',
                advanced: {
                    redirectUri: $windowProvider.$get().rootPath + '/home'
                }
            };

            oneDriveSettingsProvider.setOneDriveOptions(oneDriveOptions);
        }
    ]);
