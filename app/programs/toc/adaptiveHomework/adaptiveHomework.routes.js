angular.module('Realize.adaptiveHomework.routes', [
    'Realize.content.contentResolver',
    'Realize.paths',
    'Realize.user.currentUser'
])
    .config([
        '$routeProvider',
        'PATH',
        function($routeProvider, PATH) {
            'use strict';

            var secureRoute = [
                    '$q',
                    '$currentUser',
                    function($q, $currentUser) {
                        var allowed = $currentUser.hasRole('ROLE_TEACHER');

                        if (!allowed) {
                            return $q.reject('Insufficient Privileges!');
                        }
                        return $q.when(1);
                    }
                ];

            var AdaptiveHomeworkConfig = {
                    controller: 'AdaptiveHomeworkCtrl',
                    controllerAs: 'adaptiveHomeworkCtrl',
                    templateUrl: PATH.TEMPLATE_ROOT + '/app/programs/toc/adaptiveHomework/adaptiveHomework.ctrl.html',
                    resolve: {
                        _security: secureRoute,
                        AdaptiveHomeworkData: ['ContentResolver',
                            function(ContentResolver) {
                                return ContentResolver();
                            }
                        ]
                    }
                };

            $routeProvider
                .when('/program/:programId/:programVersion/adaptivehomework/:itemId/:itemVersion',
                    AdaptiveHomeworkConfig)
                .when('/program/:programId/:programVersion/lesson/:lessonId/:lessonVersion/' +
                    'adaptivehomework/:itemId/:itemVersion', AdaptiveHomeworkConfig)
                .when('/program/:programId/:programVersion/tier/:itemId/:itemVersion/lesson/:lessonId/' +
                    ':lessonVersion/adaptivehomework/:itemId/:itemVersion', AdaptiveHomeworkConfig)
                .when('/program/:programId/:programVersion/tier/:tierId/:tierVersion/tier2/:itemId/:itemVersion/' +
                    'lesson/:lessonId/:lessonVersion/adaptivehomework/:itemId/:itemVersion', AdaptiveHomeworkConfig)
                .when('/program/:programId/:programVersion/tier/:itemId/:itemVersion/adaptivehomework/' +
                    ':itemId/:itemVersion', AdaptiveHomeworkConfig)
                .when('/program/:programId/:programVersion/tier/:tierId/:tierVersion/tier2/:itemId/' +
                    ':itemVersion/adaptivehomework/:itemId/:itemVersion', AdaptiveHomeworkConfig)
                .when('/search/adaptivehomework/:itemId/:itemVersion', AdaptiveHomeworkConfig)
                .when('/program/:programId/:programVersion/resources/adaptivehomework/:itemId/:itemVersion',
                    AdaptiveHomeworkConfig)
                .when('/program/:programId/:programVersion/standards/lastSelectedGrade/:lastSelectedGrade/search/' +
                    ':stateStandard/:nationalLibrary/adaptivehomework/:itemId/:itemVersion', AdaptiveHomeworkConfig)
                .when('/classes/:classId/assignments/:assignmentId/preview/adaptivehomework/' +
                    'content/:itemId/:itemVersion', AdaptiveHomeworkConfig)
                .when('/classes/:classId/assignments/:assignmentId/allstudents/preview/adaptivehomework/' +
                    'content/:itemId/:itemVersion', AdaptiveHomeworkConfig)
                .when('/myLibrary/adaptivehomework/:itemId/:itemVersion', AdaptiveHomeworkConfig)
                .when('/myLibrary/lesson/:lessonId/:lessonVersion/adaptivehomework/:itemId/:itemVersion',
                    AdaptiveHomeworkConfig)
                .when('/myLibrary/tier/:itemId/:itemVersion/lesson/:lessonId/' +
                    ':lessonVersion/adaptivehomework/:itemId/:itemVersion', AdaptiveHomeworkConfig)
                .when('/myLibrary/tier/:tierId/:tierVersion/tier2/:itemId/:itemVersion/' +
                    'lesson/:lessonId/:lessonVersion/adaptivehomework/:itemId/:itemVersion', AdaptiveHomeworkConfig)
                .when('/myLibrary/tier/:itemId/:itemVersion/adaptivehomework/' +
                    ':itemId/:itemVersion', AdaptiveHomeworkConfig)
                .when('/myLibrary/tier/:tierId/:tierVersion/tier2/:itemId/' +
                    ':itemVersion/adaptivehomework/:itemId/:itemVersion', AdaptiveHomeworkConfig)
                .when('/myLibrary/playlist/:playlistId/adaptivehomework/:itemId/:itemVersion', AdaptiveHomeworkConfig)
                .when('/search/playlist/:playlistId/adaptivehomework/:itemId/:itemVersion', AdaptiveHomeworkConfig)
                .when('/browseAll/playlist/:playlistId/adaptivehomework/:itemId/:itemVersion', AdaptiveHomeworkConfig)
                .when('/search/lesson/:lessonId/:lessonVersion/adaptivehomework/:itemId/:itemVersion',
                    AdaptiveHomeworkConfig)
                .when('/program/:programId/:programVersion/resources/lesson/:lessonId/:lessonVersion/' +
                    'adaptivehomework/:itemId/:itemVersion', AdaptiveHomeworkConfig)
                .when('/browseAll/adaptivehomework/:itemId/:itemVersion', AdaptiveHomeworkConfig)
                .when('/browseAll/lesson/:lessonId/:lessonVersion/adaptivehomework/:itemId/:itemVersion',
                    AdaptiveHomeworkConfig)
                .when('/program/:programId/:programVersion/standards/lastSelectedGrade/:lastSelectedGrade/search/' +
                    ':stateStandard/:nationalLibrary/lesson/:lessonId/:lessonVersion/adaptivehomework/:itemId/' +
                    ':itemVersion', AdaptiveHomeworkConfig);
        }
	]);
