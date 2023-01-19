angular.module('Realize.reporting.data.TrackingService', [
        'Realize.paths',
        'Realize.heartbeat.contentViewerTrackingService'
    ])
    .factory('TrackingService', [
        '$log',
        '$http',
        'REST_PATH',
        'heartbeatContentViewerService',
        function($log,
                 $http,
                 REST_PATH,
                 heartbeatContentViewerService) {
            'use strict';

            var service = {};

            service.trackContent = function(classId, contentId, contentVersion, assignmentId, action, params) {
                var promise, notNullParams;

                if (!classId || !assignmentId) {
                    $log.warn('cannot track content usage');
                    return;
                }

                notNullParams = params || {};
                promise = $http({
                    method: 'POST',
                    url: [REST_PATH, 'classes', classId, 'assignment', assignmentId, 'contents', contentId,
                        contentVersion, 'tracking', action
                    ].join('/'),
                    data: {},
                    params: notNullParams,
                    cache: false
                });

                $log.log('Calling tracking event from usageTracking svc for :', action);

                promise
                    .then(function(response) {
                        // added this to stop heartbeat content close call in case of early learner
                        // intermediate route in EL will do this call when exit is clicked
                        if (action === 'stops') {
                            $log.info('Heartbeat content close call delegated to early learner');
                            return response;
                        }
                        $log.log('Calling heartbeat event from usageTracking svc for :', action);
                        return heartbeatContentViewerService.sendHeartbeatTrackingEvent(
                                classId,
                                contentId,
                                contentVersion,
                                assignmentId,
                                action,
                                notNullParams.userAssignmentId,
                                notNullParams.lmsName);
                    });
                return promise;
            };
            return service;
        }
    ]);
