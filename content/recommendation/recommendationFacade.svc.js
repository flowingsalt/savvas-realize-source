angular.module('Realize.recommendation.facadeService', ['Realize.paths'])
    .factory('RecommendationFacadeService', [
        '$http',
        '$log',
        '$q',
        'PATH',
        function($http, $log, $q, PATH) {
            'use strict';

            var service = {};

            service.getUserAssignmentId = function(classUuid, assignmentId, recommendation, languageLocale) {
                var url = PATH.REST + '/v2/assignments/userAssignment',
                    data = {
                        'itemUuid': recommendation.assessmentMapping.equellaItemId,
                        'itemVersion': recommendation.assessmentMapping.equellaItemVersion,
                        'itemType': recommendation.contentType,
                        'classUuid': classUuid,
                        'assignmentId': assignmentId,
                        'languageLocale': languageLocale
                    };

                return $http.post(url, data)
                .then(function(response) {
                    var userAssignmentId = response.data;
                    $log.log('created userAssignmentId : ' + userAssignmentId);
                    return userAssignmentId;
                }, function(error) {
                    $log.error('failed to create userAssignmentId', error);
                    return $q.reject(error);
                });
            };

            service.sendRecommendationFollowedEvent = function(classUuid,
                recommendationId, recommendedContentId) {
                var url = PATH.REST + '/recommendations/events/followed',
                    data = {
                        'classUuid': classUuid,
                        'recommendationId': recommendationId,
                        'recommendedContentId': recommendedContentId
                    };

                return $http.post(url, data)
                .then(function(response) {
                    var status = response.data;
                    $log.log('sent RecommendationFollowedEvent : ' + status);
                    return status;
                }, function(error) {
                    $log.error('failed to send RecommendationFollowedEvent', error);
                    return $q.reject(error);
                });
            };

            service.getRecommendation = function(classUuid, assignmentId, isFirstRecommendation) {
                var url = PATH.REST + '/recommendations',
                    data = {
                        'classUuid': classUuid,
                        'assignmentId': assignmentId,
                        'isFirstRecommendation': isFirstRecommendation
                    },
                    config = {
                        params : data
                    };

                return $http.get(url, config)
                .then(function(response) {
                    var recommendation = response.data;
                    $log.log('getrecommendation success', response);
                    return recommendation;
                }, function(error) {
                    $log.log('getrecommendation failed', error);
                    return $q.reject(error);
                });
            };

            service.submitRecommendation = function(isAssessment, classUuid, assignmentId, userAssignmentId,
                recommendedContentId, assessmentSessionId, hubSessionId) {
                var recommendationType = isAssessment ? 'assessment' : 'instructional',
                    url = PATH.REST + '/recommendations/' + recommendationType + '/complete',
                    data = {
                        'classUuid': classUuid,
                        'assignmentId': assignmentId,
                        'userAssignmentId': userAssignmentId,
                        'recommendedContentId': recommendedContentId
                    },
                    config = {params : data};

                if (isAssessment && assessmentSessionId && hubSessionId) {
                    data.assessmentSessionId = assessmentSessionId;
                    config.headers = {'Hub-Session': hubSessionId};
                }

                return $http.put(url, data, config)
                .then(function(response) {
                    var status = response.data;
                    $log.log('submitRecommendation success', status);
                    return status;
                }, function(error) {
                    $log.log('submitRecommendation failed', error);
                    return $q.reject(error);
                });
            };

            service.submitAssignment = function(classUuid, assignmentId, primaryUserAssignmentId) {
                var url = PATH.REST + '/recommendations/assignments/' + assignmentId + '/complete',
                    data = {
                        'classUuid': classUuid,
                        'primaryUserAssignmentId': primaryUserAssignmentId
                    },
                    config = {params : data};

                return $http.put(url, data, config)
                .then(function(response) {
                    var status = response.data;
                    $log.log('submitAssignment success', status);
                    return status;
                }, function(error) {
                    $log.log('submitAssignment failed', error);
                    return $q.reject(error);
                });
            };

            return service;
        }
]);
