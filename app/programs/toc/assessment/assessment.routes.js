angular.module('Realize.assessment.routes', [
    'Realize.content.model.contentItem',
    'Realize.content.contentDataService',
    'Realize.paths'
])
.config([
    '$routeProvider',
    'PATH',
    '$httpProvider',
    function($routeProvider, PATH, $httpProvider) {
        'use strict';

        $httpProvider.interceptors.push('AssessmentInterceptor');

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
            getRedirectUrlAfterAssessmentCloning = function(originalUrl, newAssessmentId, newVersion) {
                var newLocation = originalUrl;

                if (newLocation.includes('/assessment/')) {
                    var assessmentIdVersionRegex = /(assessment\/)[a-z0-90-]+\/[0-9]+/;
                    var replacement = ['assessment', newAssessmentId, newVersion].join('/');
                    newLocation = newLocation.replace(assessmentIdVersionRegex, replacement);
                }

                newLocation = newLocation.replace('clone_edit', 'edit');

                return newLocation;
            },
            getDeeplinkRedirectUrlAfterAssessmentCloning = function(assessmentId, version) {
                var redirectUrl = [
                    '/deeplink',
                    'assessment',
                    assessmentId,
                    version,
                    'edit'
                ].join('/');

                return redirectUrl;
            },
            redirectToNewAssessmentIfCloned = function(clonedAssessmentData, $q, $location) {
                if (!clonedAssessmentData) {
                    var originalUrl = $location.path();
                    var newLocation = originalUrl.replace('clone_edit', 'edit');
                    return $q.reject({
                        type: 'redirect',
                        path: newLocation
                    });
                }

                var redirectUrl = '';
                var newAssessmentId = clonedAssessmentData.equellaItemUuid;
                var newVersion = clonedAssessmentData.equellaItemVersion;

                var isDeeplink = $location.path().includes('deeplink/');
                if (isDeeplink) {
                    redirectUrl = getDeeplinkRedirectUrlAfterAssessmentCloning(
                        newAssessmentId, newVersion);
                } else {
                    var currentLocation = $location.path();
                    redirectUrl = getRedirectUrlAfterAssessmentCloning(currentLocation,
                        newAssessmentId, newVersion);
                }

                return $q.reject({
                    type: 'redirect',
                    path: redirectUrl
                });
            },
            deeplinkAssessmentBuilderLaunchCheck = ['Resolve', '$location', '$q',
                function(Resolve, $location, $q) {
                    return Resolve.CloneAssessmentIfNotFromMySource()
                        .then(function(clonedAssessmentData) {
                            return redirectToNewAssessmentIfCloned(clonedAssessmentData, $q, $location);
                        });
                }
            ],
            AssessmentBuilderConfig = {
                controller: 'BuilderCtrl',
                templateUrl: PATH.TEMPLATE_ROOT + '/app/programs/toc/assessment/assessmentEdit.html',
                resolve: {
                    _security: secureRoute,
                    CurrentProgramLoaded: ['Resolve',
                        function(Resolve) {
                            return Resolve.CurrentProgramLoaded();
                        }
                    ],
                    BuilderData: ['Resolve',
                        function(Resolve) {
                            return Resolve.AssessmentBuilder();
                        }
                    ],
                }
            },
            AssessmentBuilderDeeplinkCloneConfig = {
                controller: 'BuilderCtrl',
                templateUrl: PATH.TEMPLATE_ROOT + '/app/programs/toc/assessment/assessmentEdit.html',
                resolve: {
                    _security: secureRoute,
                    CurrentProgramLoaded: ['Resolve',
                        function(Resolve) {
                            return Resolve.CurrentProgramLoaded();
                        }
                    ],
                    BuilderData: ['Resolve',
                        function(Resolve) {
                            return Resolve.AssessmentBuilder();
                        }
                    ],
                    _deeplinkAssessmentBuilderLaunchCheck: deeplinkAssessmentBuilderLaunchCheck
                }
            },
            UserCreatedBuilderConfig = {
                controller: 'BuilderCtrl',
                templateUrl: PATH.TEMPLATE_ROOT + '/app/programs/toc/assessment/assessmentEdit.html',
                resolve: {
                    _security: secureRoute,
                    CurrentProgramLoaded: ['Resolve',
                        function(Resolve) {
                            return Resolve.CurrentProgramLoaded();
                        }
                    ],
                    BuilderData: ['Resolve',
                        function(Resolve) {
                            return Resolve.UserCreatedAssessment();
                        }
                    ]
                }
            },
            CreateAssessmentConfig = {
                controller: 'AssessmentCreateCtrl',
                templateUrl: PATH.TEMPLATE_ROOT + '/app/programs/toc/assessment/create/create.ctrl.html',
                resolve: {
                    _security: secureRoute,
                    BankPlayerTargetMap: ['Resolve', '$rootScope', 'ContentDataService',
                        function(Resolve, $rootScope, ContentDataService) {
                            return Resolve.CurrentProgramLoaded().then(function() {
                                return ContentDataService.getAvailableBankPlayerTargetMap(
                                    $rootScope.currentProgram.library
                                );
                            });
                        }
                    ],
                    ProgramListInfo: function() {
                        return;
                    }
                }
            },
            MyLibraryCreateAssessmentConfig = {
                controller: 'AssessmentCreateCtrl',
                templateUrl: PATH.TEMPLATE_ROOT + '/app/programs/toc/assessment/create/create.ctrl.html',
                resolve: {
                    _security: secureRoute,
                    ProgramListInfo: ['Resolve',
                        function(Resolve) {
                            return Resolve.ProgramListInfo();
                        }],
                    BankPlayerTargetMap: function() {
                        return;
                    }
                }
            },
            EssayPromptConfig = {
                controller: 'EssayPromptCtrl',
                controllerAs: 'essayPromptCtrl',
                templateUrl: PATH.TEMPLATE_ROOT + '/app/programs/toc/assessment/essay/essayPrompt.ctrl.html',
                resolve: {
                    _security: secureRoute,
                    BankPlayerTargetMap: ['Resolve', '$rootScope', 'ContentDataService',
                        function(Resolve, $rootScope, ContentDataService) {
                            return Resolve.CurrentProgramLoaded().then(function() {
                                return ContentDataService.getAvailableBankPlayerTargetMap(
                                    $rootScope.currentProgram.library
                                );
                            });
                        }
                    ],
                    resolveEssayPromptBuilder: function() {
                        return {isNewTest: true};
                    }
                }
            },
            EssayPromptBuilderConfig = {
                controller: 'EssayPromptCtrl',
                controllerAs: 'essayPromptCtrl',
                templateUrl: PATH.TEMPLATE_ROOT + '/app/programs/toc/assessment/essay/essayPrompt.ctrl.html',
                resolve: {
                    _security: secureRoute,
                    resolveEssayPromptBuilder: ['Resolve',
                        function(Resolve) {
                            return Resolve.EssayPromptAssessment();
                        }
                    ]
                }
            },
            MyLibraryEssayPromptConfig = {
                controller: 'EssayPromptCtrl',
                controllerAs: 'essayPromptCtrl',
                templateUrl: PATH.TEMPLATE_ROOT + '/app/programs/toc/assessment/essay/essayPrompt.ctrl.html',
                resolve: {
                    _security: secureRoute,
                    resolveEssayPromptBuilder: ['$q',
                        function($q) {
                            return $q.when({isNewTest: true});
                        }
                    ]
                }
            },
            AddQuestionBankConfig = {
                controller: 'AssessmentAddQuestionBankCtrl',
                templateUrl: PATH.TEMPLATE_ROOT +
                    '/app/programs/toc/assessment/questionBank/addQuestionBank/addQuestionBank.ctrl.html',
                resolve: {
                    _security: secureRoute,
                    CurrentProgramLoaded: ['Resolve',
                        function(Resolve) {
                            return Resolve.CurrentProgramLoaded();
                        }
                    ],
                    AssessmentInfo: ['Assessment', '$q', '$route',
                        function(Assessment, $q, $route) {
                            var contentId = $route.current.params.itemId,
                                contentVersion = $route.current.params.itemVersion;

                            return Assessment.getInfo(contentId, contentVersion).then(function(result) {
                                if (result.nativeAssessment) {
                                    return $q.reject(
                                        'Cannot add non-native question bank to native test',
                                        result);
                                }

                                if ($route.current.params.insertPosition) {
                                    result.insertPosition = $route.current.params.insertPosition;
                                }

                                result.itemId = contentId;

                                return result;
                            });
                        }
                    ],
                    StandardsTreeData: ['$route', 'Content',
                        function($route, Content) {
                            var id = $route.current.params.programId ? $route.current.params.programId :
                            $route.current.params.itemId,
                            version = $route.current.params.programVersion ? $route.current.params.programVersion :
                            $route.current.params.itemVersion;
                            return Content.getQuestionBankStandards(id, version);
                        }
                    ]
                }
            },
            program = '/program/:programId/:programVersion',
            tier1 = '/tier/:tierId/:tierVersion',
            tier2 = tier1 + '/tier2/:tier2Id/:tier2Version',
            myLibrary = '/myLibrary',
            deeplink = '/deeplink',

            /*
                Base routes for content items.  This is not meant to be comprehensive, but it should make it
                easier to add new URLs to the tree structure in a more consistent way.
            */

            baseRoutes = [{
                route: program,
                supportsMyContent: true,
                supportsLessons: true,
                supportsGeneralUrls: true,
                extendsMyLibraryRoutes: false
            }, {
                route: program + tier1,
                supportsMyContent: true,
                supportsLessons: true,
                supportsGeneralUrls: true,
                extendsMyLibraryRoutes: false
            }, {
                route: program + tier2,
                supportsMyContent: true,
                supportsLessons: true,
                supportsGeneralUrls: true,
                extendsMyLibraryRoutes: false
            }, {
                route: program + '/standards/lastSelectedGrade/:lastSelectedGrade/search/:stateStandard',
                supportsMyContent: false,
                supportsLessons: true,
                supportsGeneralUrls: true,
                extendsMyLibraryRoutes: false
            }, {
                route: program +
                    '/standards/lastSelectedGrade/:lastSelectedGrade/search/:stateStandard/:nationalLibrary',
                supportsMyContent: false,
                supportsLessons: true,
                supportsGeneralUrls: true,
                extendsMyLibraryRoutes: false
            }, {
                route: '/search',
                supportsMyContent: false,
                supportsLessons: true,
                supportsGeneralUrls: true,
                extendsMyLibraryRoutes: false
            }, {
                route: '/search/standard/:stateStandard',
                supportsMyContent: false,
                supportsLessons: true,
                supportsGeneralUrls: true,
                extendsMyLibraryRoutes: false
            }, {
                route: program + '/resources',
                supportsMyContent: false,
                supportsLessons: true,
                supportsGeneralUrls: true,
                extendsMyLibraryRoutes: false
            }, {
                route: myLibrary,
                supportsMyContent: true,
                supportsLessons: true,
                supportsGeneralUrls: true,
                extendsMyLibraryRoutes: false
            }, {
                route: myLibrary + tier1,
                supportsMyContent: true,
                supportsLessons: true,
                supportsGeneralUrls: true,
                extendsMyLibraryRoutes: false
            }, {
                route: myLibrary + tier2,
                supportsMyContent: true,
                supportsLessons: true,
                supportsGeneralUrls: true,
                extendsMyLibraryRoutes: false
            }, {
                route: deeplink,
                supportsMyContent: false,
                supportsLessons: true,
                supportsGeneralUrls: true,
                extendsMyLibraryRoutes: true
            }];

        // setup the routes for user content pages at different levels...
        angular.forEach(baseRoutes, function(baseConfig) {
            var base = baseConfig.route,
                lesson = base + '/lesson/:lessonId/:lessonVersion';

            if (baseConfig.extendsMyLibraryRoutes) {
                $routeProvider
                    .when(base + myLibrary + '/assessment/create', MyLibraryCreateAssessmentConfig)
                    .when(base + myLibrary +
                        '/program/:programId/:programVersion/assessment/:itemId/:itemVersion/edit',
                        UserCreatedBuilderConfig)
                    .when(base + myLibrary + '/assessment/:itemId/:itemVersion/edit', AssessmentBuilderConfig)
                    .when(base + myLibrary +
                        '/program/:programId/:programVersion/assessment/:itemId/:itemVersion/' +
                        'addQuestionBank', AddQuestionBankConfig)
                    .when(base + myLibrary + '/assessment/:itemId/:itemVersion/addQuestionBank/insert/:insertPosition',
                        AddQuestionBankConfig)
                    .when(base + myLibrary +
                        '/program/:programId/:programVersion/assessment/:itemId/:itemVersion/' +
                        'addQuestionBank/insert/:insertPosition', AddQuestionBankConfig);
            }

            // support for general URLs
            if (baseConfig.supportsGeneralUrls) {
                $routeProvider
                    .when(base + '/assessment/:itemId/:itemVersion/edit', AssessmentBuilderConfig)
                    .when('/deeplink' + base + '/assessment/:itemId/:itemVersion/edit', AssessmentBuilderConfig)
                    .when(base + '/assessment/essay/:itemId/:itemVersion/edit',
                        EssayPromptBuilderConfig)
                    .when(base + '/assessment/:itemId/:itemVersion/addQuestionBank/insert/:insertPosition',
                        AddQuestionBankConfig)
                    .when(base + '/assessment/:itemId/:itemVersion/clone_edit', AssessmentBuilderDeeplinkCloneConfig)
                    .when('/deeplink' + base + '/assessment/essay/:itemId/:itemVersion/edit',
                        EssayPromptBuilderConfig)
                    .when('/deeplink' + base +
                        '/assessment/:itemId/:itemVersion/addQuestionBank/insert/:insertPosition',
                        AddQuestionBankConfig)
                    .when('/deeplink' + base + '/assessment/:itemId/:itemVersion/clone_edit',
                        AssessmentBuilderDeeplinkCloneConfig);
            }

            // support for my content URLs
            if (baseConfig.supportsMyContent) {
                $routeProvider
                //From TOC
                    .when(base + '/assessment/create', CreateAssessmentConfig)
                    .when(base + '/assessment/essayPrompt', EssayPromptConfig)
                    .when(base + '/assessment/:itemId/:itemVersion/edit', UserCreatedBuilderConfig)
                    .when(base + '/assessment/:itemId/:itemVersion/addQuestionBank',
                        AddQuestionBankConfig)
                    .when(base +
                        '/assessment/:itemId/:itemVersion/addQuestionBank/insert/:insertPosition',
                        AddQuestionBankConfig)

                //From My Content
                .when(base + '/myContent/assessment/create', CreateAssessmentConfig)
                    .when(base + '/myContent/assessment/:itemId/:itemVersion/edit',
                        UserCreatedBuilderConfig)
                    .when(base + '/myContent/assessment/:itemId/:itemVersion/addQuestionBank',
                        AddQuestionBankConfig)
                    .when(base + '/myContent/assessment/:itemId/:itemVersion/addQuestionBank/' +
                        'insert/:insertPosition', AddQuestionBankConfig)
                    .when(base + '/myContent/assessment/essay/:itemId/:itemVersion/edit',
                        EssayPromptBuilderConfig)

                // From My Library
                .when(myLibrary + '/assessment/essay/:itemId/:itemVersion/edit',
                        EssayPromptBuilderConfig)
                .when(myLibrary + '/assessment/:itemId/:itemVersion/edit', AssessmentBuilderConfig)
                .when(myLibrary + '/essayPrompt', MyLibraryEssayPromptConfig)
                .when(myLibrary + '/assessment/create', MyLibraryCreateAssessmentConfig)
                .when(myLibrary + '/program/:programId/:programVersion/assessment/:itemId/:itemVersion/edit',
                    UserCreatedBuilderConfig)
                .when(myLibrary + '/program/:programId/:programVersion/assessment/:itemId/:itemVersion/' +
                    'addQuestionBank', AddQuestionBankConfig)
                .when(myLibrary + '/program/:programId/:programVersion/assessment/:itemId/:itemVersion/' +
                    'addQuestionBank/insert/:insertPosition', AddQuestionBankConfig);
            }

            // support for lessons within a program/tier/search
            if (baseConfig.supportsLessons) {
                $routeProvider
                    .when(lesson + '/assessment/:itemId/:itemVersion/edit', AssessmentBuilderConfig)
                    .when(lesson + '/assessment/:itemId/:itemVersion/addQuestionBank',
                        AddQuestionBankConfig)
                    .when(lesson + '/assessment/:itemId/:itemVersion/clone_edit', AssessmentBuilderDeeplinkCloneConfig)
                    .when(lesson + '/assessment/:itemId/:itemVersion/addQuestionBank/' +
                        'insert/:insertPosition', AddQuestionBankConfig)
                    .when('/deeplink' + lesson + '/assessment/:itemId/:itemVersion/edit', AssessmentBuilderConfig)
                    .when('/deeplink' + lesson + '/assessment/:itemId/:itemVersion/addQuestionBank',
                        AddQuestionBankConfig)
                    .when('/deeplink' + lesson + '/assessment/:itemId/:itemVersion/clone_edit',
                        AssessmentBuilderDeeplinkCloneConfig)
                    .when('/deeplink' + lesson + '/assessment/:itemId/:itemVersion/addQuestionBank/' +
                        'insert/:insertPosition', AddQuestionBankConfig);
            }
        });
    }
]);
