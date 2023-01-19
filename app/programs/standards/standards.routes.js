angular.module('Realize.standards.routes', [
        'Realize.content.model.contentItem',
        'RealizeApp', // for Resolve module - will be deprecated soon
        'Realize.paths'
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
                ],

                StandardsConfig = {
                    controller: 'StandardsTreeCtrl',
                    templateUrl: PATH.TEMPLATE_ROOT + '/app/programs/standards/standardsTree.html',
                    reloadOnSearch: false,
                    resolve: {
                        _security: secureRoute,
                        StandardsTreeData: ['$route', 'Content',
                            function($route, Content) {
                                return Content.getContentStandards(
                                    $route.current.params.programId,
                                    $route.current.params.programVersion);
                            }
                        ]
                    }
                },

                StandardsSearchConfig = {
                    controller: 'StandardsSearchCtrl',
                    templateUrl: PATH.TEMPLATE_ROOT + '/app/programs/standards/standardsSearch.html',
                    resolve: {
                        _security: secureRoute,
                        ProgramContent: ['Resolve',
                            function(Resolve) {
                                return Resolve.Program();
                            }
                        ]
                    }
                };

            $routeProvider
                .when('/program/:programId/:programVersion/standards', StandardsConfig)
                .when('/program/:programId/:programVersion/standards/lastSelectedGrade/:lastSelectedGrade',
                    StandardsConfig)

            .when('/program/:programId/:programVersion/standards/lastSelectedGrade/:lastSelectedGrade/' +
                    'search/:stateStandard/:nationalLibrary', StandardsSearchConfig)
                .when('/program/:programId/:programVersion/standards/lastSelectedGrade/:lastSelectedGrade/' +
                    'search/:stateStandard', StandardsSearchConfig)
                .when('/search/standard/:stateStandard', StandardsSearchConfig)
                .when('/deeplink/search/standard/:stateStandard', StandardsSearchConfig);
        }
    ]);
