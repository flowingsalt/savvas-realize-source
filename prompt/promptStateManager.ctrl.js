angular.module('Realize.Prompt.StateManager', [
    'Realize.paths',
    'Realize.Prompt.promptApiUtilService',
    'Realize.content.model.contentItem'
])
    .config([
        '$routeProvider',
        'PATH',
        function($routeProvider, PATH) {
            'use strict';

            var secureRoute = ['$q',
                function($q) {
                    return $q.when({});
                }
            ],
            PromptConfig = {
                controller: 'PromptCtrl',
                controllerAs: 'promptCtrl',
                templateUrl: PATH.TEMPLATE_ROOT + '/prompt/prompt.dir.html',
                resolve: {
                    ClassRosterData: [
                        'Resolve',
                        function(Resolve) {
                            return Resolve.ClassRoster();
                        }
                    ],
                    CurrentPromptList: [
                        'promptApiUtilService',
                        '$route',
                        '$currentUser',
                        function(promptApiUtilService, $route, $currentUser) {
                            return $currentUser.isTeacher ?
                                promptApiUtilService.getPromptList($route.current.params.classId) : null;
                        }
                    ],
                    GetActiveDiscussionList: [
                        'promptApiUtilService',
                        '$route',
                        function(promptApiUtilService, $route) {
                            return promptApiUtilService.getActiveDiscussionList($route.current.params.classId);
                        }
                    ],
                    _security: secureRoute
                },
                reloadOnSearch: false
            };
            $routeProvider
                .when('/classes/:classId/discussPrompt', PromptConfig)
                .when('/deeplink/classes/:classId/discussPrompt', PromptConfig);
        }
    ])
    .controller('PromptCtrl', [
        '$scope',
        'CurrentPromptList',
        'GetActiveDiscussionList',
        'Content',
        '$location',
        'promptApiUtilService',
        '$route',
        '$rootScope',
        '$currentUser',
        function($scope, CurrentPromptList, GetActiveDiscussionList, Content, $location, promptApiUtilService, $route,
            $rootScope, $currentUser) {
            'use strict';

            $scope.promptList = [];
            $scope.activeList = [];
            $scope.currentView = 'active';
            var search = $location.search();

            if (!_.isEmpty(CurrentPromptList)) {
                $scope.currentView = 'list';
                $scope.promptList = _.map(CurrentPromptList, function(prompt) {
                    return new Content(prompt);
                });
            }

            if (!_.isEmpty(GetActiveDiscussionList)) {
                $scope.currentView = 'active';
                $scope.activeList = GetActiveDiscussionList;
                $scope.zeroDiscussionState = false;
            } else if (_.isEmpty(GetActiveDiscussionList) && $currentUser.isStudent) {
                // show Zero state for active discussion page if GetActiveDiscussionList is empty and user is student
                $scope.currentView = 'active';
                $scope.studentZeroDiscussionState = true;
            } else {  // show Zero state for active discussion page if GetActiveDiscussionList is empty
                $scope.currentView = 'active';
                $scope.zeroDiscussionState = true;
            }

            $scope.$on('prompt.view.change.zeroState', function() {
                if (!$scope.promptList.length) {
                    $scope.currentView = 'list' ;
                    $scope.showZeroState = true ;
                }
            });

            if (search.discuss === 'list' || (search.activeTab === 'myPrompts' && !search.promptView))  {
                $scope.currentView = 'list';
                $scope.$emit('prompt.view.change.zeroState');
                $location.search('discuss', null);
                $rootScope.isZeroState = false;
            } else {
                if (search.promptView === 'create') {
                    $scope.currentView = 'create';
                }
            }

            $scope.getPromptView = function(view) {
                return $scope.currentView === view;
            };

            $scope.showDiscussion = function() {
                return !$scope.zeroDiscussionState && !$scope.studentZeroDiscussionState;
            };

            $scope.$on('prompt.view.change', function(event, currentView) {
                $scope.prompt = {};
                if (currentView === 'list') {
                    $rootScope.viewLoading = true;
                    $location.search('promptView', null);
                    promptApiUtilService.getPromptList($route.current.params.classId).then(function(data) {
                        $scope.promptList = !!data && data.length ?  _.map(data, function(prompt) {
                            return new Content(prompt); }) : [];
                        if ($scope.currentView === 'active' && !$scope.promptList.length ||
                            $scope.currentView === 'create' && !$scope.promptList.length && !$scope.activeList.length) {
                            $scope.$emit('prompt.view.change.zeroState');
                        } else if ($scope.currentView === 'create' && !$scope.promptList.length &&
                            $scope.activeList.length) {
                            $scope.$emit('prompt.view.change.zeroState');
                        } else {
                            $scope.currentView = currentView;
                        }
                        $rootScope.viewLoading = false;
                    });
                } else if (currentView === 'active') {
                    $rootScope.viewLoading = true;
                    $location.search('promptView', null);
                    promptApiUtilService.getActiveDiscussionList($route.current.params.classId).then(function(data) {
                        $scope.activeList = data;
                        if ($scope.activeList.length !== 0) {
                            $scope.zeroDiscussionState = false;
                        }
                        $scope.currentView = currentView;
                        $rootScope.viewLoading = false;
                    });
                } else {
                    $scope.currentView = currentView;
                }
            });

            $scope.$on('discuss.prompt.createView.change', function(event, view) {
                $scope.$broadcast('prompt.createView.change', view);
            });

            $scope.$on('prompt.mode.editing', function(event, prompt, currentView) {
                $scope.prompt = {
                    id: prompt.id,
                    title: prompt.title,
                    body: prompt.discussionPrompt,
                    thumbnails: prompt.thumbnailUrls[0]
                };
                $scope.currentView = currentView;
            });

        }
    ]);
