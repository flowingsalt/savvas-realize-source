angular.module('RealizeApp.logoutCtrl', [
        'Realize.paths',
        'webStorageModule'
    ])
    .controller('LogoutCtrl', [
        '$window',
        'webStorage',
        'PATH',
        'telemetryService',
        'baseTelemetryEvents',
        function($window, webStorage, PATH, telemetryService, baseTelemetryEvents) {
            'use strict';
            var activityDetails = baseTelemetryEvents.createEventData('userLogoutEvent', {});
            telemetryService.sendTelemetryEvent(activityDetails);
            webStorage.clear();
            $window.location.href = PATH.ROOT + '/j_spring_security_logout';
        }
    ]);
