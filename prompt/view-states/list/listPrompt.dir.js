angular.module('Realize.Prompt.List', [
    'Realize.paths',
    'rlzComponents.components.i18n',
    'Realize.analytics',
    'Realize.Prompt.promptApiUtilService',
    'Realize.prompt.constants',
    'Realize.content.model.contentItem'
])
    .directive('listPrompt', [
        'PATH',
        '$location',
        'promptApiUtilService',
        '$log',
        '$routeParams',
        'PROMPT_CONSTANTS',
        '$route',
        'Content',
        function(PATH, $location, promptApiUtilService, $log, $routeParams, PROMPT_CONSTANTS, $route,
            Content) {
            'use strict';
            return {
                templateUrl: PATH.TEMPLATE_CACHE + '/prompt/view-states/list/listPrompt.dir.html',
                controller: 'ListPromptCtrl',
                controllerAs: 'listPromptCtrl',
                link: function($scope) {

                    $scope.thumnailPath = function(prompt) {
                        var url = prompt.thumbnailUrls ? prompt.thumbnailUrls : prompt.url;
                        return Array.isArray(url) ? url[0] : url;
                    };

                    $scope.editPrompt = function($event, prompt) {
                        $scope.$emit('prompt.mode.editing', prompt, 'edit');
                    };

                    $scope.createPrompt = function() {

                        promptApiUtilService.getPromptList($route.current.params.classId).then(function(data) {
                            $scope.$parent.promptList = !!data && data.length ?  _.map(data, function(prompt) {
                            return new Content(prompt); }) : [];
                            $location.search('promptView', 'create');
                            $scope.$emit('prompt.view.change', 'create');
                        });
                        promptApiUtilService.analyticsForPrompt(PROMPT_CONSTANTS.ANALYTICS.CREATE_PROMPT);
                    };

                    $scope.back = function(event) {
                        if (event) {
                            event.stopPropagation();
                        }
                        $location.search('activeTab', null);
                        $scope.$emit('prompt.view.change', 'active');
                    };

                    $scope.open = function(event, prompt) {
                        if (event) {
                            event.stopPropagation();
                        }
                        var next = [$location.path(), prompt.id, prompt.version].join('/');
                        $location.path(next);
                        promptApiUtilService.analyticsForPrompt(PROMPT_CONSTANTS.ANALYTICS.OPEN_PROMPT);
                    };

                    $scope.$on('prompt.list.delete', function(event, prompt) {
                        promptApiUtilService.deletePrompt(prompt.id)
                            .then(function() {
                                prompt.isDeleted = true;
                            }, function(error) {
                                $log.error('Error %s in deleting the post: %s', error, prompt.id);
                            });
                    });

                    $scope.$on('prompt.list.unDelete', function(event, prompt) {
                        promptApiUtilService.unDeletePrompt(prompt.id,  $routeParams.classId)
                            .then(function() {
                                prompt.isDeleted = false;
                            }, function(error) {
                                $log.error('Error %s in deleting the post: %s', error, prompt.id);
                            });

                    });

                    $scope.removePrompt = function(event, prompt) {
                        if (event) {
                            event.stopPropagation();
                        }
                        $scope.$emit('prompt.list.delete', prompt);
                        promptApiUtilService.analyticsForPrompt(PROMPT_CONSTANTS.ANALYTICS.REMOVE_PROMPT);
                    };

                    $scope.unDeletePrompt = function(event, prompt) {
                        if (event) {
                            event.stopPropagation();
                        }
                        $scope.$emit('prompt.list.unDelete', prompt);
                    };

                    $scope.zeroStatePage = function() {
                        return $scope.$parent.showZeroState && !$scope.$parent.promptList.length ? true : false;
                    };
                }
            };
        }
    ])
    .controller('ListPromptCtrl', [
        function() {}
    ]);
