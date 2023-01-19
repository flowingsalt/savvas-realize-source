angular.module('Realize.classRoster.classDataService', [
    'RealizeDataServices',
    'Realize.paths',
    'Realize.constants.googleClassroom'
])
    .service('ClassDataService', [
        '$log',
        '$q',
        '$http',
        '$rootScope',
        'REST_PATH',
        'ClassRoster',
        function($log, $q, $http, $rootScope, REST_PATH, ClassRoster) {
            'use strict';

            var svc = this;

            svc.getClassesReportingData = function(teacherStat) {

                var url = REST_PATH + '/v2/classes/assignments/results',
                    rosters = [],
                    hasCoTeachersMetadata = false,
                    shouldPersistToServer = false,
                    coTeachersByClassCollection = {};

                return $http.get(url, {params: {needLoginStats: !!teacherStat}})
                    .then(function(response) {

                        $rootScope.currentUser.$setInactiveRosterCount(
                            response.data.inactiveCount || 0
                        );

                        hasCoTeachersMetadata = angular.isDefined(response.data.coTeachersByClass) &&
                            !_.isEmpty(response.data.coTeachersByClass);

                        if (hasCoTeachersMetadata) {
                            coTeachersByClassCollection = response.data.coTeachersByClass;
                        }

                        $rootScope.currentUser.setAttribute('hasCoTeachers',
                            hasCoTeachersMetadata, shouldPersistToServer);

                        angular.forEach(response.data.rosters, function(data) {

                            var roster = new ClassRoster(data);

                            if (response.data.classActivityDataMap) {
                                roster.reportingData = response.data.classActivityDataMap[roster.classId] || {};
                            } else {
                                roster.reportingData = {};
                            }

                            roster.$setSharedTeachers(coTeachersByClassCollection[roster.classId]);

                            rosters.push(roster);
                        });

                        return teacherStat ?
                            {rosters: rosters, teacherStat: response.data.teacherLoginStatistics}
                            : rosters;
                    }, function(response) {
                        return $q.reject(response);
                    });
            };
        }
    ]);
