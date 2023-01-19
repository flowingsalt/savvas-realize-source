angular.module('Realize.navigationService', [
        'ngRoute'
    ])
    .factory('NavigationService', [
        '$rootScope',
        '$location',
        '$log',
        '$route',
        '$window',
        '$timeout',
        function($rootScope, $location, $log, $route, $window, $timeout) {
            'use strict';

            var service = {};

            service.stack = [];

            // it makes sense to reset the application navigation at these
            // points, the user cannot "go back" once they're at these pages
            // real navigation is handled by the browser
            var endpoints = ['/program', '/classes', '/data'];

            // to avoid adding a path to the location stack we
            // can add its path or a regular expression matching its path
            // to this array
            var ignoredPaths = [/classes\/.+\/assignments\/student\/.+/];

            var isIgnoredPath = function(path) {
                var decision = false;
                angular.forEach(ignoredPaths, function(ignored) {
                    if (angular.isObject(ignored) && ignored.test(path)) {
                        decision = true;
                    } else if (path === ignored) {
                        decision = true;
                    }
                });
                return decision;
            };

            var addPathToStack = function(path, last) {
                if (service.stack.length && (path === last || path === service.stack[service.stack.length - 1])) {
                    return;
                }

                // if this is a page without application back navigation
                if ($.inArray(path, endpoints) >= 0) {
                    // truncate the stack
                    service.stack = [path];
                } else if (!isIgnoredPath(path)) {
                    service.stack.push(path);
                }
            };

            service.navigateOutsideAngularContext = function(urlToNavigate) {
                $window.location.href = urlToNavigate;
            };

            service.navigateToPath = function(path, searchParams) {
                if (path.startsWith('/community')) {
                    path = path.split('/community')[1];
                }

                var params = {};
                if (searchParams) {
                    searchParams.forEach(function(value, key) {
                        params[key] = value;
                    });
                }

                $timeout(function() {
                    $location.path(path).search(params);
                }, 0);
            };

            service.navigate = function(url) {
                var isURLRelative = !/^https?:\/\//i.test(url);
                if (isURLRelative) {
                    service.navigateToPath(url);
                    return;
                }

                var navigateTo = new URL(url);
                var forceNavigate = navigateTo.searchParams.get('forceNavigate');
                if (navigateTo.origin === $window.location.origin && forceNavigate !== 'true') {
                    service.navigateToPath(navigateTo.pathname, navigateTo.searchParams);
                } else {
                    service.navigateOutsideAngularContext(url);
                }
            };

            /**
             * Called when the user clicks the back arrow to navigate the application
             *
             * @param {Function|String|Event} fallback Determines the path if none exists in the location stack
             * @return {Boolean} false if location stack is empty and no fallback is provided
             */
            service.back = function(fallback, force) {
                // always get rid of current location
                service.stack.pop();

                if (force) {
                    // next location (fallback) will replace last location
                    service.stack.pop();
                }

                if (!force && service.stack.length) {
                    $location.path(service.stack.pop());
                } else if (angular.isDefined(fallback)) {
                    if (angular.isFunction(fallback)) {
                        $location.path(fallback($location.path()));
                    } else if (angular.isString(fallback)) {
                        $location.path(fallback);
                    } else if (angular.isObject(fallback)) {
                        // assume this is an event object and the scope contains navigationFallback information
                        service.back(angular.element(fallback.target).scope().navigationFallback, force);
                    }
                } else {
                    $log.warn('going back... location stack empty... no fallback provided!');
                    return false;
                }

                $location.replace();
                return true;
            };

            service.replaceLocationWith = function(location) {
                service.stack.pop();
                $location.path(location);
            };

            /**
             * @param {String} params*
             * @return the id/version of the first match in the params list
             */
            service.routeParentByParams = function() {
                var parent = {},
                    parentFound = false,
                    index = 0;

                while (index < arguments.length && !parentFound) {
                    parent.name = arguments[index];

                    if ($route.current.params[parent.name + 'Id']) {
                        parent.id = $route.current.params[parent.name + 'Id'];

                        // version could be 0, needs to by stringified
                        parent.version = $route.current.params[parent.name + 'Version'];
                        parentFound = true;
                    }

                    index += 1;
                }

                return parent;
            };

            // alias is for controllers with a custom back method
            $rootScope.back = $rootScope.goBack = service.back;

            $rootScope.$watch('location.path()', function(path, old) {
                addPathToStack(path, old);
                $rootScope.$broadcast('navigation.event.location.change');
            });

            $rootScope.$on('$routeChangeStart', function(event, next, current) {
                service.previousRoute = current;
            });

            return service;
        }
    ])
    .run([
        '$rootScope',
        'NavigationService',
        function($rootScope, NavigationService) {
            'use strict';
            // alias is for controllers with a custom back method
            $rootScope.back = $rootScope.goBack = NavigationService.back;
        }
    ]);
