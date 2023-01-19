angular.module('Realize.content.viewProgress', ['Realize.paths'])
    .service('ViewProgressService', [
        '$q',
        '$http',
        '$log',
        'PATH',
        function($q, $http, $log, PATH) {
            'use strict';

            this.getProgressReport = function(classId, assignmentId, isTeacher, studentId) {
                var url = PATH.REST + '/v2/classes/' + classId + '/assignments/' + assignmentId + '/results';
                if (isTeacher && studentId) {
                    url = PATH.REST + '/v2/classes/' + classId + '/assignments/' + assignmentId + '/students/' +
                    studentId + '/results';
                }
                return $http.get(url).then(function(response) {
                        var progressReport = response.data;
                        $log.log('get assignment progress success', response);
                        return progressReport;
                    }, function(error) {
                        $log.log('get assignment progress failed', error);
                        return $q.reject(error);
                    });
            };

        }

    ]);
