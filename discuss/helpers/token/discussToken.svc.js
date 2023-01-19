angular.module('Realize.Discussions.TokenSvc', [
    'Realize.common.tokenInterceptor',
    'Realize.user.currentUser'
])
    .service('DiscussTokenSvc', [
        '$http',
        '$route',
        '$q',
        '$log',
        'CommonTokenInterceptor',
        '$currentUser',
        'REST_PATH',
        function($http, $route, $q, $log, CommonTokenInterceptor, currentUser, REST_PATH) {
            'use strict';
            var svc = this,
                AUTHORIZATION_HEADER = 'Authorization';

            var _token = {};

            var _hasToken = function(path) {
                return _token[path];
            };

            var getClassId = function() {
                return $route.current.params.classId;
            };

            var getAssignmentId = function() {
                return $route.current.params.assignmentId;
            };

            var getTokenPath = function() {
                var classId = getClassId(),
                assignmentId = getAssignmentId(),
                path;

                if (currentUser.isTeacher) {
                    path = REST_PATH + '/discussions/tokens/classes/' + classId;
                } else {
                    path = REST_PATH + '/discussions/tokens/classes/' + classId + '/assignments/' + assignmentId;
                }
                return path;
            };

            var getPathFromToken = function(token) {
                var tokenPath;

                _.each(_token, function(cachedToken, path) {
                    if (cachedToken === token) {
                        tokenPath = path;
                    }
                });
                return tokenPath;
            };

            var updateTokenAndReturn = function(tokenPath, response) {
                _token[tokenPath] = response.headers(AUTHORIZATION_HEADER);

                $log.log('Updated Token: ',  tokenPath);

                return _token[tokenPath];
            };

            svc.shouldIntercept = function($httpConfig) {
                return $httpConfig.url.indexOf(window.discussionApiUrl) > -1 &&
                        !$httpConfig.service;
            };

            svc.createToken = function(tokenPath) {
                return $http.post(tokenPath);
            };

            svc.getToken = function() {
                var tokenPath = getTokenPath();

                if (!_hasToken(tokenPath)) {

                    return svc.createToken(tokenPath).then(function(response) {
                        return updateTokenAndReturn(tokenPath, response);
                    });
                } else {
                    $log.log('Same Token: ', 'Path ' + tokenPath);

                    return $q.when(_token[tokenPath]);
                }
            };

            svc.updateToken = function(token) {
                var tokenPath = getPathFromToken(token),
                headers = {};
                delete _token[tokenPath];
                headers[AUTHORIZATION_HEADER] = token;
                return $http.put(tokenPath, {}, headers).then(function(response) {
                    return updateTokenAndReturn(tokenPath, response);
                });
            };

            svc.recoverToken = function($httpConfig) {
                return svc.updateToken($httpConfig.headers[AUTHORIZATION_HEADER])
                    .then(function(token) {
                        return CommonTokenInterceptor.updateHeaderAndReturn(token, $httpConfig);
                    });
            };

            return svc;
        }
    ]);
