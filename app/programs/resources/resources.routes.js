angular.module('Realize.resources.routes', [
    'RealizeApp',
    'Realize.paths',
    'Realize.user.currentUser',
    'Realize.content.contentResolver'
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
                        if (!$currentUser.hasRole('ROLE_TEACHER')) {
                            return $q.reject('Insufficient Privileges!');
                        }
                        return $q.when({});
                    }
                ],

                ResourcesConfig = {
                    controller: 'ResourcesCtrl',
                    templateUrl: PATH.TEMPLATE_ROOT + '/app/programs/resources/resources.ctrl.html',
                    resolve: {
                        _security: secureRoute,
                        featureResourcesData: ['ContentResolver', '$rootScope', '$location',
                            function(ContentResolver, $rootScope, $location) {
                                var routeProgramId = $location.path().split('/')[2],
                                    isSameProgramId = $rootScope.currentProgram &&
                                        ($rootScope.currentProgram.id === routeProgramId);
                                return isSameProgramId ? $rootScope.currentProgram : ContentResolver();
                            }
                        ]
                    }
                };

            $routeProvider
                .when('/program/:programId/:programVersion/resources', ResourcesConfig);
        }
    ]);
