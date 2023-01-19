angular.module('Realize.heartbeat.heartbeatsApiService', [
    'Realize.heartbeat.constants',
    'Realize.heartbeat.TokenService'
])
    .factory('heartbeatApiService', [
        '$http',
        '$log',
        '$timeout',
        function($http, $log, $timeout) {
            'use strict';

            var service = this,
                heartbeatIntervalInMillis = window.heartbeatPulseIntervalInMillis,
                timeoutPromise,
                stopHeartbeat = false;

            service.nextHeartbeat = function() {
                service.cancelPendingHeartbeat();
                timeoutPromise = $timeout(service.sendHeartbeatEvent, heartbeatIntervalInMillis);
            };

            service.cancelPendingHeartbeat = function() {
                $timeout.cancel(timeoutPromise);
            };

            service.stopHeartbeats = function() {
                stopHeartbeat = true;
                service.cancelPendingHeartbeat();
            };

            service.sendHeartbeatEvent = function(isLoginHeartbeatEvent) {
                if (stopHeartbeat) {
                    return;
                }
                var heartbeatEventUrl = !!isLoginHeartbeatEvent ?
                    window.heartbeatLoginEventUrl : window.heartbeatEventUrl;
                return $http({
                    url: heartbeatEventUrl,
                    method: 'POST'
                })
                    .catch(function(heartbeatTokenRejectionInfo) {
                        $log.error('Heartbeat notification event missed', heartbeatTokenRejectionInfo);
                    })
                    .finally(function() {
                        if (!stopHeartbeat) {
                            service.nextHeartbeat();
                        }
                    });
            };
            return service;
        }]);
