angular.module('Realize.Active.Discussion', [
    'Realize.paths',
    'rlzComponents.components.i18n',
    'Realize.navigationService',
    'Realize.analytics',
    'Realize.Discussions.Navigation',
    'Realize.Prompt.promptApiUtilService',
    'Realize.prompt.constants',
    'Realize.user.currentUser',
    'Realize.assignment.facadeService'
])
    .directive('activeDiscuss', [
        'PATH',
        'NavigationService',
        '$location',
        '$window',
        'DiscussNavigation',
        '$routeParams',
        'promptApiUtilService',
        'PROMPT_CONSTANTS',
        '$currentUser',
        'AssignmentFacadeService',
        'locationUtilService',
        'penpalService',
        '$timeout',
        function(PATH, NavigationService, $location, $window, DiscussNavigation, $routeParams, promptApiUtilService,
            PROMPT_CONSTANTS, $currentUser, AssignmentFacadeService, locationUtilService, penpalService, $timeout) {
            'use strict';
            return {
                templateUrl: PATH.TEMPLATE_CACHE + '/prompt/view-states/active/activeDiscussList.dir.html',
                controller: 'ActiveDiscussCtrl',
                controllerAs: 'activeDiscussCtrl',
                link: function($scope) {

                    $scope.init = function() {
                        $timeout(function() {
                            if (locationUtilService.isDeeplinkDiscussTabActive()) {
                                var body = document.body,
                                    html = document.documentElement;
                                var height = Math.max(body.scrollHeight, body.offsetHeight,
                                    html.clientHeight, html.scrollHeight, html.offsetHeight);
                                var payload = { resize_height: height };
                                penpalService.connectToParent().then(function(connection) {
                                    connection.parent.exec('RESIZE_PAGE', payload);
                                });
                            }
                        }, 1000);
                    };
                    $scope.init();
                    $scope.isTeacher = $currentUser.isTeacher;
                    $scope.thumbnailPath = function(prompt) {
                        var defaultIcon = PATH.IMAGES + '/mediatype/icon/discussion_prompt@2x.png';
                        return angular.isDefined(prompt.meta.thumbnail) ? prompt.meta.thumbnail : defaultIcon;
                    };

                    $scope.goToPromptPage = function() {
                        var path = $location.path();
                        $location.path(path).search({
                            activeTab:'myPrompts'
                        });
                    };

                    $scope.createPrompt = function() {
                        $location.search('promptView', 'create');
                        $scope.$emit('prompt.view.change', 'create');
                        promptApiUtilService.analyticsForPrompt(PROMPT_CONSTANTS.ANALYTICS.CREATE_PROMPT);
                    };

                    $scope.enableBackButton = function() {
                        return !locationUtilService.isDeeplinkDiscussTabActive();
                    };

                    $scope.back = function(event) {
                        if (event) {
                            event.stopPropagation();
                        }
                        NavigationService.back('/classes', true);
                    };

                    $scope.myPromptList = function(event) {
                        if (event) {
                            event.preventDefault();
                        }
                        $scope.goToPromptPage();
                        $scope.$emit('prompt.view.change', 'list');
                        promptApiUtilService.analyticsForPrompt(PROMPT_CONSTANTS.ANALYTICS.MY_PROMPT_LIST);
                    };

                    $scope.viewAssignment = function(event, prompt) {
                        if (event) {
                            event.preventDefault();
                            event.stopPropagation();
                        }
                        if (locationUtilService.isDeeplinkDiscussTabActive()) {
                            $window.parent.location.href = $window.location.protocol +
                            '//' + $window.location.hostname + '/dashboard/classes/' + $routeParams.classId +
                            '/details/assignments/' + prompt.assignmentSummary.assignmentId + '/review';
                        } else {
                            DiscussNavigation.goToStudentStatusView($routeParams.classId,
                                prompt.assignmentSummary.assignmentId);
                        }
                    };

                    $scope.open = function(event, prompt) {
                        if (event) {
                            event.stopPropagation();
                        }
                        var deeplinkPrefix = '';
                        if (locationUtilService.isDeeplinkDiscussTabActive()) {
                            deeplinkPrefix = '/deeplink';
                        }
                        var path = [
                            deeplinkPrefix,
                            'classes',
                            $routeParams.classId,
                            'discussPrompt/assignments',
                            prompt.assignmentSummary.assignmentId,
                            'content',
                            prompt.post.meta.item
                        ].join('/'),
                            assignmentId = prompt.assignmentSummary.assignmentId,
                            classId = $routeParams.classId;

                        promptApiUtilService.analyticsForPrompt(PROMPT_CONSTANTS.ANALYTICS.OPEN_DISCUSSION);

                        if (!$scope.isTeacher) {
                            AssignmentFacadeService.get(classId, assignmentId)
                            .then(function(response) {
                                var isAdaptive = response.isAdaptiveAssignment(),
                                userAssignmentId = response.$getPrimaryMetadata().userAssignmentId;
                                AssignmentFacadeService.setInProgress(userAssignmentId, isAdaptive, classId,
                                        assignmentId);
                            });
                        }

                        $location.path(path).search({
                            discuss: 'active'
                        });
                    };
                }
            };
        }
    ])
    .controller('ActiveDiscussCtrl', [
        function() {}
    ]);
