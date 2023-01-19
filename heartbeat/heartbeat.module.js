angular.module('Realize.heartbeat', [
    'Realize.heartbeat.keyStore',
    'Realize.heartbeat.constants',
    'Realize.common.tokenInterceptor',
    'Realize.common.tokenRecovery',
    'Realize.heartbeat.TokenService',
    'Realize.heartbeat.heartbeatsApiService',
    'Realize.heartbeat.contentViewerTrackingService'
])
    .config(['CommonTokenInterceptorProvider',
        'CommonTokenRecoveryProvider',
        function(CommonTokenInterceptorProvider, CommonTokenRecoveryProvider) {
            'use strict';
            CommonTokenInterceptorProvider.registerTokenProvider('HeartbeatTokenService');
            CommonTokenRecoveryProvider.registerTokenProvider('HeartbeatTokenService');
        }
    ]);
