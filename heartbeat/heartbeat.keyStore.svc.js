angular.module('Realize.heartbeat.keyStore', [])
    .factory('heartbeatKeyStore', function() {
        'use strict';
        var service = this,
            store = {};

        service.addHeartbeatToken = function(key, value) {
            store[key] = value;
        };

        service.getHeartbeatToken = function(key) {
            return store[key];
        };

        service.removeHeartbeatToken = function(key) {
            delete store[key];
        };

        service.emptyHeartbeatTokenStore = function() {
            store = {};
        };

        return service;
    });
