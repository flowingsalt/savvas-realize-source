angular.module('Realize.Interceptors.SessionTimeout', [])
    .provider('SessionTimeoutService',
        function() {
            'use strict';

            var eventHandlerChain = [];

            this.addEventHandler = function(eventHandler, priority) {
                if (!priority || priority < 0) {
                    priority = 0;
                }

                eventHandlerChain.push({
                    eventHandler: eventHandler,
                    priority: priority
                });

                //greater priority number gets precendence
                eventHandlerChain = _.sortBy(eventHandlerChain, function(eventHandler) {
                    return -1 * eventHandler.priority;
                });
            };

            this.$get = ['$q', '$log', '$injector', function($q, $log, $injector) {
                var svc = this;
                var isSessionTimedOut = false;

                svc.setSessionExpiryStatus = function(newStatus) {
                    isSessionTimedOut = newStatus || isSessionTimedOut;
                };

                svc.getSessionExpiryStatus = function() {
                    return isSessionTimedOut;
                };

                svc.getEventHandlerChain = function() {
                    return eventHandlerChain;
                };

                svc.breakOutOfChain = function($httpResponse) {
                    return $q.reject($httpResponse);
                };

                var returnHttpResponse = svc.continueToNextInChain = function($httpResponse) {
                    return $httpResponse;
                };

                svc.executeEventHandlers = function($httpResponse) {
                    var i, promise, thenFn, getCurrentEventHandler, currentEventHandler;

                    if (eventHandlerChain.length === 0) {
                        $q.reject($httpResponse);
                    }

                    i = 0;

                    getCurrentEventHandler = function() {
                        currentEventHandler = angular.isString(eventHandlerChain[i].eventHandler) ?
                            $injector.get(eventHandlerChain[i].eventHandler) :
                            $injector.invoke(eventHandlerChain[i].eventHandler);
                    };

                    getCurrentEventHandler();
                    promise = $q.when(currentEventHandler($httpResponse));

                    for (i = 1; i < eventHandlerChain.length; i++) {
                        getCurrentEventHandler();

                        thenFn = currentEventHandler;
                        promise = promise.then(thenFn, returnHttpResponse);
                    }

                    return promise;
                };

                return svc;
            }];
        }
    )

    .config(['$httpProvider',
        function($httpProvider) {
            'use strict';

            var sessionTimeoutInterceptor = ['$q', 'SessionTimeoutService',
                function($q, SessionTimeoutService) {
                    return {
                        responseError: function(response) {
                            if (response.status === 401) {
                                return SessionTimeoutService.executeEventHandlers(response);
                            } else {
                                return $q.reject(response);
                            }
                        }
                    };
                }
            ];

            $httpProvider.interceptors.push(sessionTimeoutInterceptor);
        }
    ]);
