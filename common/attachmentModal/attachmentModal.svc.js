angular.module('Realize.Attach.attachmentModalUtilService', [
    'Realize.paths'
])
    .service('attachmentModalUtilService', [
        '$q',
        '$http',
        '$log',
        'REST_PATH',
        function($q, $http, $log, REST_PATH) {
            'use strict';
            var svc = this,
                headers = {
                    headers: {'Content-Type': 'application/json'}
                },
                getAttachUrl = function(classId, assignmentId) {
                    return [
                        REST_PATH,
                        'discussions',
                        'classes',
                        classId,
                        'assignments',
                        assignmentId,
                        'attachments'
                    ].join('/');
                },
                getFileAttachRequest = function(classId, assignmentId, fileData) {
                    var formData = new FormData(),
                        params = {
                            headers: {'Content-Type': undefined},
                            transformRequest: angular.identity
                        },
                        //angular.identity prevents Angular to do anything on our data (like serializing it).
                        options = angular.extend({}, params);
                    formData.append('file', fileData);
                    return $http.post(getAttachUrl(classId, assignmentId), formData, options);
                },
                getLinkAttachRequest = function(classId, assignmentId, link) {
                    return $http.post(getAttachUrl(classId, assignmentId) + '?url=' + link);
                },
                doAttach = function(request) {
                    return request.then(
                        function(response) {
                            return response.data;
                        },
                        function(response) {
                            return $q.reject(response);
                        }
                    );
                };

            svc.saveAttachment = function(classId, assignmentId, fileData) {
                var request = getFileAttachRequest(classId, assignmentId, fileData);
                return doAttach(request);
            };

            svc.saveLinkAttachment = function(classId, assignmentId, attachmentLink) {
                var request = getLinkAttachRequest(classId, assignmentId, attachmentLink);
                return doAttach(request);
            };

            svc.downloadAttachment = function(classId, assignmentId, attachmentId, attachmentName, attachmentType) {

                var options = angular.extend({}, headers),
                    downloadUrl = [REST_PATH, 'discussions/classes', classId, 'assignments', assignmentId,
                    'attachments', attachmentId].join('/');
                options.params = {fileName: attachmentName, attachmentType: attachmentType};

                return $http.get(downloadUrl, options)
                    .then(function(response) {
                        return response;
                    }, function(response) {
                        return $q.reject(response);
                    });
            };

            return svc;
        }
    ]);
