angular.module('Realize.eText.routes', [
    'RealizeApp', //FIXME: Resolve module needs to be modularize
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

            $routeProvider.when('/program/:programId/:programVersion/eText', {
                 controller: 'ETextCtrl',
                 templateUrl: PATH.TEMPLATE_ROOT + '/app/programs/eText/eText.ctrl.html',
                 resolve: {
                     _security: secureRoute,
                     eTextData: ['Resolve',
                         function(Resolve) {
                             return Resolve.eText();
                         }
                     ]
                 }
             });
        }
    ]);
