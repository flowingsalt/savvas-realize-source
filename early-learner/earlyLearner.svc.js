angular.module('Realize.earlyLearner.teacher.earlyLearnerService', [
    'Realize.paths',
    'Realize.classRosterThemes.constants'
])
    .factory('EarlyLearnerService', [
        '$location',
        '$http',
        'REST_PATH',
        'EARLY_LEARNER_CONSTANTS',
        function($location, $http, REST_PATH, EARLY_LEARNER_CONSTANTS) {
            'use strict';
            var path = '/changeTheme';
            return {
                gotoChangeThemePage: function() {
                    var changeThemePath = $location.path().split('?')[0] + path;
                    $location.path(changeThemePath);
                },
                goBack: function() {
                    $location.path($location.path().split(path)[0]);
                },
                saveTheme: function(earlyLearnerStudents, standardStudents) {
                    var getUserId = function(user) {
                            return user.userId;
                        },
                        earlyLearnerStudentIds = earlyLearnerStudents.map(getUserId),
                        standardStudentIds = standardStudents.map(getUserId);
                    return $http.post(REST_PATH + '/users/learningexperience', {
                        earlyLearnerStudentIds: earlyLearnerStudentIds,
                        standardStudentIds: standardStudentIds
                    }).then(function() {
                        // so ClassRoster cached the current roster data. Routing back to student list,
                        // the current cached roster data needs to be updated and not a make a extra call to update
                        // current user infor by setting persist to be false.
                        earlyLearnerStudents.forEach(function(user) {
                            user.setAttribute(EARLY_LEARNER_CONSTANTS.PROFILE_KEY,
                                EARLY_LEARNER_CONSTANTS.THEME_EARLY_LEARNER, false);
                        });
                        standardStudents.forEach(function(user) {
                            user.setAttribute(EARLY_LEARNER_CONSTANTS.PROFILE_KEY,
                                EARLY_LEARNER_CONSTANTS.THEME_STANDARD, false);
                        });
                    });
                }
            };
        }
    ]);
