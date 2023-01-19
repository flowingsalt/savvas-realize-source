angular.module('Realize.heartbeat.TokenService', [
    'Realize.paths',
    'Realize.heartbeat.constants'
])
    .factory('HeartbeatTokenService', [
        'REST_PATH',
        '$http',
        '$log',
        '$q',
        'HEARTBEAT_CONSTANTS',
        'heartbeatKeyStore',
        'CommonTokenInterceptor',
        function(REST_PATH, $http, $log, $q, HEARTBEAT_CONSTANTS, heartbeatKeyStore, CommonTokenInterceptor) {
            'use strict';

            var service = {},
                heartBeatAuthToken;

            function getTokenFromCache() {
                return heartbeatKeyStore
                    .getHeartbeatToken(HEARTBEAT_CONSTANTS.HEARTBEAT_KEYSTORE_KEY);
            }

            function tokenStore(token) {
                heartbeatKeyStore
                    .addHeartbeatToken(HEARTBEAT_CONSTANTS.HEARTBEAT_KEYSTORE_KEY,
                        token);
            }

            function deleteToken() {
                heartbeatKeyStore
                    .removeHeartbeatToken(HEARTBEAT_CONSTANTS.HEARTBEAT_KEYSTORE_KEY);
            }

            service.shouldIntercept = function($httpConfig) {
                return $httpConfig.url.indexOf('/heartbeat/events/') > -1;
            };

            service.getToken = function() {
                var cachedToken = getTokenFromCache();
                if (cachedToken) {
                    return $q.when(cachedToken);
                } else {
                    return $http({
                        url: REST_PATH + HEARTBEAT_CONSTANTS.AUTH_TOKEN_URL,
                        method: 'GET',
                    }).then(function(response) {
                        heartBeatAuthToken = 'Bearer ' + response.data.access_token;
                        tokenStore(heartBeatAuthToken);
                        return heartBeatAuthToken;
                    }, function(authTokenRejection) {
                        return $q.reject(authTokenRejection);
                    });
                }
            };

            service.recoverToken = function(rejectedHttpConfig) {
                deleteToken();
                return service.getToken().then(function(newHeartbeatToken) {
                    return CommonTokenInterceptor.updateHeaderAndReturn(newHeartbeatToken, rejectedHttpConfig);
                });
            };
            return service;
        }
    ]);
