angular.module('Realize.myContent.routes', [
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

                MyContentConfig = {
                    controller: 'MyContentCtrl',
                    templateUrl: PATH.TEMPLATE_ROOT + '/app/programs/toc/myContent/myContent.ctrl.html',
                    resolve: {
                        _security: secureRoute,
                        MyContentData: ['Resolve',
                            function(Resolve) {
                                return Resolve.MyContent();
                            }
                        ]
                    }
                } ,

                MyLibraryContentConfig = {
                    template: '<my-library-upload></my-library-upload>',
                    resolve: {
                        _security: secureRoute,
                    }
                },

                program = '/program/:programId/:programVersion',
                tier1 = '/tier/:tierId/:tierVersion',
                tier2 = tier1 + '/tier2/:tier2Id/:tier2Version',

            /*
                Base routes for content items.  This is not meant to be comprehensive, but it should make it
                easier to add new URLs to the tree structure in a more consistent way.
            */

            baseRoutes = [{
                route: program,
                supportsMyContent: true
            }, {
                route: program + tier1,
                supportsMyContent: true
            }, {
                route: program + tier2,
                supportsMyContent: true
            }, {
                route: program + '/standards/lastSelectedGrade/:lastSelectedGrade/search/:stateStandard',
                supportsMyContent: false
            }, {
                route: program +
                '/standards/lastSelectedGrade/:lastSelectedGrade/search/:stateStandard/:nationalLibrary',
                supportsMyContent: false
            }, {
                route: '/search',
                supportsMyContent: false
            }, {
                route: '/search/standard/:stateStandard',
                supportsMyContent: false
            }];

            // setup the routes for user content pages at different levels...
            angular.forEach(baseRoutes, function(baseConfig) {
                var base = baseConfig.route;

                // support for my content URLs
                if (baseConfig.supportsMyContent) {
                    $routeProvider
                        .when(base + '/myContent', MyContentConfig)
                        .when(base + '/myContent/googleDrive', MyContentConfig)
                        .when(base + '/myContent/link', MyContentConfig)
                        .when(base + '/myContent/file', MyContentConfig);
                }
            });
            $routeProvider
                .when('/myLibrary/file', MyLibraryContentConfig)
                .when('/myLibrary/link', MyLibraryContentConfig);
        }
    ]);
