angular.module('Realize.discussionPrompt.discussionPromptRoutes', [
        'Realize.discussionPrompt.discussionPromptResolver',
        'Realize.paths'
    ])
    .config([
        '$routeProvider',
        'PATH',
        function($routeProvider, PATH) {
            'use strict';

            var DiscussionPromptConfig = {
                    controller: 'DiscussionPromptCtrl',
                    controllerAs: 'discussionPromptCtrl',
                    templateUrl: PATH.TEMPLATE_ROOT + '/app/programs/toc/discussionPrompt/reviewDiscussionPrompt.html',
                    resolve: {
                        DiscussionPromptLoaded: ['DiscussionPromptResolver',
                            function(DiscussionPromptResolver) {
                                return DiscussionPromptResolver.discussionPromptload();
                            }
                        ],
                        CurrentProgramLoaded: ['Resolve',
                            function(Resolve) {
                                return Resolve.CurrentProgramLoaded();
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
                    supportsLessons: true,
                    supportsDiscussionPrompt: true
                }, {
                    route: program + tier1,
                    supportsLessons: true,
                    supportsDiscussionPrompt: true
                }, {
                    route: program + tier2,
                    supportsLessons: true,
                    supportsDiscussionPrompt: true
                }, {
                    route: '/search',
                    supportsLessons: true,
                    supportsDiscussionPrompt: true
                }, {
                    route: myLibrary,
                    supportsLessons: true,
                    supportsDiscussionPrompt: true
                }, {
                    route: myLibrary + tier1,
                    supportsLessons: true,
                    supportsDiscussionPrompt: true
                }, {
                    route: myLibrary + tier2,
                    supportsLessons: true,
                    supportsDiscussionPrompt: true
                }];

            // setup the routes for user content pages at different levels...
            angular.forEach(baseRoutes, function(baseConfig) {
                var base = baseConfig.route,
                    lesson = base + '/lesson/:lessonId/:lessonVersion';

                // support for discussion prompt within a program/tier/search

                if (baseConfig.supportsDiscussionPrompt) {
                    $routeProvider
                        .when('/classes/:classId/discussPrompt/:itemId/:itemVersion/', DiscussionPromptConfig)
                        .when('/deeplink/classes/:classId/discussPrompt/:itemId/:itemVersion/', DiscussionPromptConfig)
                        .when(base + '/discussionprompt/:itemId/:itemVersion/', DiscussionPromptConfig)
                        .when(lesson + '/discussionprompt/:itemId/:itemVersion/', DiscussionPromptConfig);
                }

            });
        }
    ]);
