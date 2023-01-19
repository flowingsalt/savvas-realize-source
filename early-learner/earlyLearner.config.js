angular.module('Realize.earlyLearner.teacher.config', [
    'Realize.paths'
])
    .config([
        '$routeProvider',
        'PATH',
        function($routeProvider, PATH) {
            'use strict';
            var ELStudentsListConfig = {
                controller: 'ChangeThemeCtrl',
                controllerAs: 'changeThemeCtrl',
                templateUrl: PATH.TEMPLATE_ROOT + '/early-learner/changeTheme.html',
                resolve: {
                    hasPermission: [
                        '$q',
                        '$currentUser',
                        function($q, $currentUser) {
                            if (!$currentUser.isTeacher) {
                                return $q.reject('Insufficient Privileges!');
                            }
                            return $q.when({});
                        }
                    ],
                    resolveClassRosterData: [
                        'Resolve',
                        function(Resolve) {
                            return Resolve.ClassRoster();
                        }
                    ]
                }
            };
            $routeProvider.when('/classes/:classId/students/changeTheme', ELStudentsListConfig)
                .when('/deeplink/classes/:classId/students/changeTheme', ELStudentsListConfig);
        }
    ]);
