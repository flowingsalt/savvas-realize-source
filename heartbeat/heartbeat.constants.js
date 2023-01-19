angular.module('Realize.heartbeat.constants', [])
    .constant('HEARTBEAT_CONSTANTS', {
        AUTH_TOKEN_URL: '/heartbeat/tokens',
        HEARTBEAT_KEYSTORE_KEY: 'heartbeatTokenKey',
        HTTP_STATUS_CODE : {
            UNAUTHORISED: 401,
            INTERNAL_SERVER: 500
        }
    });
