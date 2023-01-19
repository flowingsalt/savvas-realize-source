angular.module('Realize.assignment.teacher.notebook.notebookTokenService', [
    'Realize.paths',
    'Realize.assignment.teacher.notebook.constants',
    'Realize.user.currentUser'
])
    .factory('NotebookTokenService', [
        'REST_PATH',
        '$http',
        '$log',
        '$q',
        '$rootScope',
        '$route',
        'webStorage',
        'NOTEBOOK_CONSTANTS',
        '$currentUser',
        function(REST_PATH, $http, $log, $q, $rootScope, $route, webStorage, NOTEBOOK_CONSTANTS, $currentUser) {
            'use strict';

            //fetch userAssignment id and store it.
            var service = {},
                getStorageKey = function() {
                    var userAssignmentId = $route.current.params.userAssignmentId;
                    return NOTEBOOK_CONSTANTS.PREFIX.NOTEBOOK_TOKEN + $currentUser.userId + userAssignmentId;
                },
                requestCounter = 0;

            //if token exist then return it else call api and generate token again.
            service.getToken = function() {
                var token = service.getTokenFromCache(),
                    userAssignmentId = $route.current.params.userAssignmentId;
                if (token) {
                    return $q.when(token);
                } else {
                    var url = REST_PATH + '/notebooks/tokens/classes/' + $route.current.params.classId +
                        '/userAssignments/' + userAssignmentId;
                    return $http({
                        url: url,
                        method: 'POST'
                    }).then(function(response) {
                        service.tokenStore(response.data.id);
                        requestCounter = 0;
                        return response.data.id;
                    }, function(err) {
                        $log.error('error getting notebook token', err);
                        return $q.reject('error getting notebook token', err);
                    });
                }
            };

            service.getTokenFromCache = function() {
                return webStorage.session.get(getStorageKey());
            };

            //to cache token
            service.tokenStore = function(token) {
                webStorage.session.add(getStorageKey(), token);
            };

            service.deleteToken = function() {
                webStorage.session.remove(getStorageKey());
            };

            service.shouldIntercept = function(config) {
                return config.service && config.service === NOTEBOOK_CONSTANTS.APP_NAME;
            };

            service.recoverToken = function($httpConfig) {
                service.deleteToken();
                if (requestCounter < NOTEBOOK_CONSTANTS.MAX_HIT_COUNT) {
                    requestCounter++;
                    $log.info('[NotebookToken]: token failure, retry attempt:' + requestCounter);
                    return service.getToken();
                } else {
                    $log.error('[NotebookToken]: max hit count exceeded');
                    return $q.reject('notebook token max hit count exceeded', $httpConfig);
                }
            };

            return service;
        }
    ]);
