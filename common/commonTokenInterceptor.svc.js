angular.module('Realize.common.tokenInterceptor', [])
    .provider('CommonTokenInterceptor', function commonTokenInterceptorProvider() {
        'use strict';

        var tokenProviders = [];

        this.registerTokenProvider = function(provider) {
            tokenProviders.push(provider);
        };

        function updateHeaderAndReturn(token, config) {
            config.headers = config.headers || {};
            config.headers = angular.extend(config.headers, {
                Authorization: token
            });
            return config;
        }

        this.$get = ['$injector',
                     '$log',
                     '$q',
            function($injector, $log, $q) {
                return {
                    updateHeaderAndReturn: updateHeaderAndReturn,
                    request: function(config) {
                        var tokenService;
                        tokenProviders.forEach(function(tokenProviderName) {
                            try {
                                var provider = $injector.get(tokenProviderName);
                                //check for appropriate API based on the microservice url
                                if (angular.isFunction(provider.shouldIntercept) &&
                                    angular.isFunction(provider.getToken)) {
                                    if (provider.shouldIntercept(config)) {
                                        tokenService = provider;
                                    }
                                } else {
                                    $log.log('The provider ' + tokenProviderName + 'does not have a appropriate api\n',
                                        'Methods required :  shouldIntercept and getToken');
                                }
                            }
                            catch (e) {
                                $log.log('Failed to get provider :', tokenProviderName,  e.getMessage());
                            }
                        });
                        if (angular.isDefined(tokenService)) {
                            return tokenService.getToken()
                                        .then(function(token) {
                                            return updateHeaderAndReturn(token, config);
                                        }, function(error) {
                                            return $q.reject(error);
                                        });
                        } else {
                            return config;
                        }
                    }
                };
            }
        ];
    });
