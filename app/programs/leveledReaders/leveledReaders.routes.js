angular.module('Realize.leveledReaders.routes', [
    'RealizeApp', // for Resolve module - will be deprecated soon
    'Realize.content',
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

            ContentViewerConfig = {
                controller: 'ContentCtrl',
                templateUrl: PATH.TEMPLATE_ROOT + '/views/contentViewer.html',
                resolve: {
                    _security: secureRoute,
                    ContentViewerData: ['ContentResolver',
                        function(ContentResolver) {
                            return ContentResolver();
                        }
                    ]
                }
            },

            LeveledReaderSearchConfig = {
                controller: 'LeveledReadersSearchCtrl',
                templateUrl: PATH.TEMPLATE_ROOT + '/app/programs/leveledReaders/leveledReadersSearch.ctrl.html',
                resolve: {
                    _security: secureRoute,
                    CurrentProgramLoaded: ['Resolve',
                        function(Resolve) {
                            return Resolve.CurrentProgramLoaded();
                        }
                    ],
                    CurrentScale: ['LeveledReadersSvc',
                        function(LeveledReadersSvc) {
                            var scaleType = LeveledReadersSvc.getScaleTypeFromRoute();

                            return LeveledReadersSvc.getScale(scaleType);
                        }
                    ]
                },
                reloadOnSearch: false
            };

            $routeProvider
                .when('/program/:programId/:programVersion/leveledreaders', {
                    controller: 'LeveledReadersCtrl',
                    templateUrl: PATH.TEMPLATE_ROOT + '/app/programs/leveledReaders/leveledReaders.ctrl.html',
                    resolve: {
                        _security: secureRoute,
                        ZeroState: ['$q', '$rootScope',
                            function($q, $rootScope) {
                                var deferred = $q.defer();
                                if ($rootScope.currentUser.$hasLeveledReader()) {
                                    deferred.resolve();
                                } else {
                                    deferred.reject({
                                        type: 'redirect',
                                        path: '/program'
                                    });
                                }

                                return deferred.promise;
                            }
                        ],
                        CurrentProgramLoaded: ['Resolve',
                            function(Resolve) {
                                return Resolve.CurrentProgramLoaded();
                            }
                        ],
                        Scales: ['LeveledReadersSvc',
                            function(svc) {
                                return svc.getScales();
                            }
                        ]
                    }
                })
                .when('/program/:programId/:programVersion/leveledreaders/search', LeveledReaderSearchConfig)
                .when('/program/:programId/:programVersion/leveledreaders/search/content/:itemId/' +
                    ':itemVersion', ContentViewerConfig);
        }
    ]);
