/*jslint bitwise: true */
angular.module('Realize.heartbeat.contentViewerTrackingService', [
    'Realize.heartbeat.TokenService',
    'Realize.content.constants'
])
.factory('heartbeatContentViewerService', [
    '$log',
    '$http',
    'CONTENT_CONSTANTS',
    '$q',
    function($log, $http, CONTENT_CONSTANTS, $q) {
    'use strict';
    var service = this;
    var suppressHeartbeatEvent = false;

    service.sendHeartbeatTrackingEvent = function(
        classId,
        contentId,
        contentVersion,
        assignmentId,
        action,
        userAssignmentId,
        lmsName) {
        var contentData = {},
            heartbeatContentTrackingUrl;
        var deferred = $q.defer();

        $log.log('Inside HeartbeatService sendHeartbeatTrackingEvent function:', action);
        function getDeterministicUUIDForInput(combination) {
            var uuid = 0;
            _.each(combination, function(value, index) {
                var utfEquivalent = combination.charCodeAt(index);
                uuid = ((uuid << 5) - uuid) + utfEquivalent;
                uuid = uuid & uuid;
            });
            return Math.abs(uuid);
        }

        function getContentViewerDataObj() {
            contentData = {
                classId:classId,
                contentId: contentId,
                contentVersion: contentVersion,
                assignmentId: assignmentId,
                userAssignmentId: userAssignmentId,
                lmsName: lmsName
            };
            return JSON.stringify({activityId: userAssignmentId ?
                userAssignmentId : getDeterministicUUIDForInput(classId + assignmentId + contentId + contentVersion),
                activityData: contentData});
        }

        function validateContentViewerActionEvent() {
            if (action === CONTENT_CONSTANTS.CONTENT_VIEWER_ACTIVITY.STARTS) {
                heartbeatContentTrackingUrl = window.heartbeatOpenContentEventUrl;
            } else if (action === CONTENT_CONSTANTS.CONTENT_VIEWER_ACTIVITY.STOPS) {
                heartbeatContentTrackingUrl = window.heartbeatCloseContentEventUrl;
            } else {
                $log.warn('Heartbeat-Service: Ignoring unknown content viewer action', action);
                return false;
            }
            return true;
        }

        if (suppressHeartbeatEvent && window.isEarlyLearner) {
            return;
        } else if (!!window.heartbeatFeatureEnabled && validateContentViewerActionEvent()) {
            if (action === CONTENT_CONSTANTS.CONTENT_VIEWER_ACTIVITY.STOPS) {
                suppressHeartbeatEvent = true;
            }
            $http({
                method: 'POST',
                url: heartbeatContentTrackingUrl,
                data: getContentViewerDataObj(),
                headers: {
                    'Content-Type': 'application/json'
                }
            })
            .then(function(response) {
                $log.log('Inside SUCCESS HeartbeatService sendHeartbeatTrackingEvent function:', action);
                deferred.resolve(response);
            }, function(requestRejectionInfo) {
                $log.error('Heartbeat-Service: content viewer tracking(' + action +
                    ')call failed with error', requestRejectionInfo);
            });
        }
        $log.log('Before return promise sendHeartbeatTrackingEvent function:', action);
        return deferred.promise;
    };
    return service;
}]);
