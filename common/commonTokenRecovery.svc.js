angular.module('Realize.common.tokenRecovery', [])
.provider('CommonTokenRecovery', function commonTokenRecoveryProvider() {
    'use strict';

    var tokenProviders = [], sessionTimeoutServiceProvider;

    this.registerTokenProvider = function(provider) {
        tokenProviders.push(provider);
    };

    this.setSessionTimeoutServiceProvider = function(provider) {
        sessionTimeoutServiceProvider = provider;
    };

    this.$get = ['$injector',
                 '$log',
       function($injector, $log) {
            return function($httpResponse) {
                var tokenService;
                /* used $injector instead of injecting $http to avoid circular
                injector dependency with Messages provider which also require $http*/
                var $http = $injector.get('$http');
                tokenProviders.forEach(function(tokenProviderName) {
                    try {
                        var provider = $injector.get(tokenProviderName);
                        if (angular.isFunction(provider.shouldIntercept) &&
                                angular.isFunction(provider.recoverToken)) {
                            if (provider.shouldIntercept($httpResponse.config)) {
                                tokenService = provider;
                            }
                        } else {
                            $log.log('The provider ' + tokenProviderName + 'does not have a appropriate api\n',
                            'Methods required :  shouldIntercept and recoverToken');
                        }
                    }
                    catch (e) {
                        $log.log('Failed to get provider :', tokenProviderName,  e.getMessage());
                    }
                });
                if (angular.isDefined(tokenService)) {

                    if ($httpResponse.config.headers.authorizationretry === true) {
                        return sessionTimeoutServiceProvider.breakOutOfChain($httpResponse);
                    }

                    return tokenService.recoverToken($httpResponse.config).then(function() {

                        $httpResponse.config.headers = $httpResponse.config.headers || {};
                        $httpResponse.config.headers = angular.extend($httpResponse.config.headers, {
                            authorizationretry: true
                        });

                        return $http($httpResponse.config).then(
                                sessionTimeoutServiceProvider.breakOutOfChain,
                                sessionTimeoutServiceProvider.breakOutOfChain);
                    }, sessionTimeoutServiceProvider.breakOutOfChain);
                }

                return $httpResponse;
            };
        }
    ];
});
