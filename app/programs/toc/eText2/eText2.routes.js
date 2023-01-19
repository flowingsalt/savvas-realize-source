angular.module('Realize.eText2Builder.routes', [
    'Realize.paths',
    'Realize.content.contentDataService',
    'Realize.user.currentUser',
    'Realize.eText2Builder.eText2DataService',
    'Realize.common.optionalFeaturesService'
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
                CreateEText2Config = {
                    controller: 'EText2CreateCtrl',
                    controllerAs: 'eText2CreateCtrl',
                    templateUrl: PATH.TEMPLATE_ROOT + '/app/programs/toc/eText2/create/create.ctrl.html',
                    resolve: {
                        _security: secureRoute,
                        ZeroState: ['$q', 'OptionalFeatures',
                            function($q, OptionalFeatures) {
                                if (OptionalFeatures.isAvailable('buildEText.feature.enabled')) {
                                    return $q.when();
                                } else {
                                    return $q.reject({
                                        type: 'redirect',
                                        path: '/home'
                                    });
                                }
                            }
                        ],
                        eText2Data: ['Resolve', '$rootScope', 'EText2DataService',
                            function(Resolve, $rootScope, EText2DataService) {
                                return Resolve.CurrentProgramLoaded().then(function() {
                                    return EText2DataService.getEText2StudentEdition(
                                        $rootScope.currentProgram
                                    );
                                });
                            }
                        ]
                    }
                },
                program = '/program/:programId/:programVersion',
                tier1 = '/tier/:tierId/:tierVersion',
                tier2 = tier1 + '/tier2/:tier2Id/:tier2Version',
                myLibrary = '/myLibrary',

                baseRoutes = [{
                    route: program,
                    supportsMyContent: true,
                    supportsLessons: true,
                    supportsGeneralUrls: true
                }, {
                    route: program + tier1,
                    supportsMyContent: true,
                    supportsLessons: true,
                    supportsGeneralUrls: true
                }, {
                    route: program + tier2,
                    supportsMyContent: true,
                    supportsLessons: true,
                    supportsGeneralUrls: true
                }, {
                    route: program + '/standards/lastSelectedGrade/:lastSelectedGrade/search/:stateStandard',
                    supportsMyContent: false,
                    supportsLessons: true,
                    supportsGeneralUrls: true
                }, {
                    route: program +
                    '/standards/lastSelectedGrade/:lastSelectedGrade/search/:stateStandard/:nationalLibrary',
                    supportsMyContent: false,
                    supportsLessons: true,
                    supportsGeneralUrls: true
                }, {
                    route: '/search',
                    supportsMyContent: false,
                    supportsLessons: true,
                    supportsGeneralUrls: true
                }, {
                    route: '/search/standard/:stateStandard',
                    supportsMyContent: false,
                    supportsLessons: true,
                    supportsGeneralUrls: true
                }, {
                    route: myLibrary,
                    supportsMyContent: true,
                    supportsLessons: true,
                    supportsGeneralUrls: true
                }, {
                    route: myLibrary + tier1,
                    supportsMyContent: true,
                    supportsLessons: true,
                    supportsGeneralUrls: true
                }, {
                    route: myLibrary + tier2,
                    supportsMyContent: true,
                    supportsLessons: true,
                    supportsGeneralUrls: true
                }];

            angular.forEach(baseRoutes, function(baseConfig) {
                var base = baseConfig.route;

                // support for my content URLs
                if (baseConfig.supportsMyContent) {
                    $routeProvider
                        //From TOC
                        .when(base + '/eText2/create', CreateEText2Config)

                        //From My Content
                        .when(base + '/myContent/eText2/create', CreateEText2Config);
                }
            });
        }
    ]);
