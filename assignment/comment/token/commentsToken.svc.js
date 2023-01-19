angular.module('Realize.comment.TokenSvc', ['Realize.common.tokenInterceptor',
    'Realize.user.currentUser'
])
    .service('CommentsTokenSvc', [
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
                isStudent = function() {
                    return currentUser.isStudent;
                },
                commentsTokenUrl = [REST_PATH, 'comments', 'tokens'].join('/'),
                classCommentsTokenUrl,
                getClassCommentsTokenUrl = function(classId) {
                    return [commentsTokenUrl, 'classes', classId].join('/');
                },
                _token = {},
                _hasToken = function(classOrStudentId) {
                    return _token[classOrStudentId];
                },
                getRelevantIdByUser = function() {
                    if (isStudent()) {
                        return currentUser.userId;
                    }
                    return $route.current.params.classId;
                },
                getRelevantIdByUserFromToken = function(token) {
                    var classOrStudentId;
                    for (classOrStudentId in _token) {
                        if (_token[classOrStudentId] === token) {
                            return classOrStudentId;
                        }
                    }
                    return '';
                },
                updateTokenAndReturn = function(classOrStudentId, response) {
                    _token[classOrStudentId] = response.headers('Authorization');

                    $log.log('Updated Token');

                    return _token[classOrStudentId];
                };

            svc.setTokenForTestingOnly = function(classOrStudentId, token) {
                _token[classOrStudentId] = token;
            };

            svc.shouldIntercept = function(config) {
                return config.service && config.service === 'comments';
            };

            svc.createToken = function(classId) {
                if (isStudent()) {
                    return $http.post(commentsTokenUrl);
                }
                classCommentsTokenUrl = getClassCommentsTokenUrl(classId);
                return $http.post(classCommentsTokenUrl);
            };

            svc.getToken = function() {
                var classOrStudentId = getRelevantIdByUser();

                if (!_hasToken(classOrStudentId)) {

                    return svc.createToken(classOrStudentId).then(function(response) {
                        return updateTokenAndReturn(classOrStudentId, response);
                    });
                } else {
                    $log.log('Unchanged token');

                    return $q.when(_token[classOrStudentId]);
                }
            };

            svc.makeRelevantUpdateToken = function(classId, token) {
                if (isStudent()) {
                    return $http.put(commentsTokenUrl, {}, {headers: {'Authorization':token}});
                }
                classCommentsTokenUrl = getClassCommentsTokenUrl(classId);
                return $http.put(classCommentsTokenUrl, {}, {headers: {'Authorization':token}});
            };

            svc.updateToken = function(token) {
                var classOrStudentId = getRelevantIdByUserFromToken(token);
                delete _token[classOrStudentId];
                return svc.makeRelevantUpdateToken(classOrStudentId, token).then(function(response) {
                    return updateTokenAndReturn(classOrStudentId, response);
                });
            };

            svc.recoverToken = function($httpConfig) {
                return svc.updateToken($httpConfig.headers.Authorization)
                    .then(function(token) {
                        return CommonTokenInterceptor.updateHeaderAndReturn(token, $httpConfig);
                    });
            };

            return svc;
        }
    ]);
