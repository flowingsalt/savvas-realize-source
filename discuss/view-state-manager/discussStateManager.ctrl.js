angular.module('Realize.Discussions.templates', []);

angular.module('Realize.Discussions.StateManager', [
    'Realize.Discussions.templates',
    'Realize.Discussions.Helpers',
    'Realize.Discussions.States',
    'Realize.classRoster.resolves.getCurrent',
    'Realize.paths',
    'Realize.assignment.facadeService'
    ])
    .config([
        '$routeProvider',
        function($routeProvider) {
            'use strict';
            var DiscussPromptConfig = {
                resolve: {
                    Post: ['GetPostForAssignment', function(resolve) {
                        return resolve();
                    }],
                    CurrentRoster: ['ClassRosterResolveGetCurrent', function(resolve) {
                        return resolve();
                    }],
                    LocaleSettings: ['DiscussLocale', '$rootScope', '$window',
                        function(DiscussLocale, $rootScope, $window) {
                            var newLocale = $rootScope.currentUser ?
                                $rootScope.currentUser.getAttribute('profile.locale') :
                                $window.currentUser.userAttributes['profile.locale'];

                            return DiscussLocale.loadMessages(newLocale)
                                .then(function() {
                                    DiscussLocale.updateLocale(newLocale);
                                });
                        }
                    ],
                    Assignment: ['AssignmentFacadeService', '$route', function(AssignmentFacadeService, $route) {
                        return AssignmentFacadeService.get($route.current.params.classId,
                            $route.current.params.assignmentId);
                    }]
                },
                template: '<div ng-include="getTemplateUrl()"></div>',
                controller: 'DiscussAppCtrl',
                reloadOnSearch: false
            };
            $routeProvider.when('/classes/:classId/discussPrompt/assignments/:assignmentId/content/:itemId',
                DiscussPromptConfig)
                .when('/deeplink/classes/:classId/discussPrompt/assignments/:assignmentId/content/:itemId',
                    DiscussPromptConfig);
        }
    ])
    .controller('DiscussAppCtrl', [
        '$scope',
        '$location',
        'DiscussNavigation',
        'Post',
        '$window',
        '$route',
        'PATH',
        'DISCUSS_INTEGRATION_MESSAGE_LOCATION',
        'DiscussPost',
        'Assignment',
        function($scope, $location, DiscussNavigation, Post, $window, $route, PATH,
                 DISCUSS_INTEGRATION_MESSAGE_LOCATION, DiscussPost, Assignment) {

            'use strict';

            var ctrl = this, userAssignmentId = $route.current.params.userAssignmentId;

            DiscussPost.prototype.$isQuickLinksEnabledForModerator = !$scope.currentUser.isStudent;

            ctrl.initViewParam = function(currentView) {
                if (!currentView) {
                    $location.search('view', 'list');
                } else {
                    $location.search('view', currentView);
                }
            };

            ctrl.initBoardIdParam = function() {
                $location.search('boardId', Post.boardId);
            };

            ctrl.initViewParam('thread');
            DiscussNavigation.goToPost(Post.boardId, Post.id);

            $scope.post = Post;

            $scope.isDiscussAssignment = false;

            if (Assignment) {
                $scope.isDiscussAssignment = true;
                $scope.isDiscussAssignmentReviewMode = Assignment.isAssignmentPastDueDate();
                $scope.participantId = $scope.currentUser.userId;
                if ($scope.currentUser.isStudent && !userAssignmentId) {
                    var metaData = Assignment.$findItemMetadata(Post.meta.item, $scope.currentUser.userId);
                    if (metaData) {
                        $location.search('userAssignmentId', metaData.userAssignmentId);
                    }
                }
            }
            //version needed for tracking
            $location.search('itemVersion', Post.meta.itemVersion);

            $scope.$on('$locationChangeStart', function(e, newUrl) {
                var discussUrlWithoutNavigationParams =
                        [DiscussNavigation.getWindowLocationOrigin() + PATH.ROOT, 'classes',
                            $route.current.params.classId, 'discuss', 'assignments', $route.current.params.assignmentId,
                            'content', $route.current.params.itemId].join('/'),

                shouldRefreshDiscussPage = newUrl === discussUrlWithoutNavigationParams;

                if (shouldRefreshDiscussPage) {
                    $route.reload();
                }
            });

            $scope.$on('$destroy', function() {
                DiscussNavigation.clearParams();
                $location.search('userAssignmentId', null);
                $location.search('itemVersion', null);
                $location.search('discuss', null);
            });

            $scope.sanitizeCode = function(messageCode) {
                return DISCUSS_INTEGRATION_MESSAGE_LOCATION + '|' + messageCode;
            };

            $scope.getTemplateUrl = function() {
                var tmplUrl = '';

                switch ($location.search().view) {
                    case 'create':
                        tmplUrl = PATH.TEMPLATE_ROOT + '/discuss/view-states/create/create.html';
                        break;
                    case 'list':
                        tmplUrl = PATH.TEMPLATE_ROOT + '/discuss/view-states/list/list.html';
                        break;
                    case 'thread':
                        tmplUrl = PATH.TEMPLATE_ROOT + '/discuss/view-states/thread/thread.html';
                        break;
                    default:
                        tmplUrl = '';
                }

                return tmplUrl;
            };
        }
    ]);
