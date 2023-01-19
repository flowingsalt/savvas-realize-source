angular.module('Realize.discussionPrompt.discussionPromptCtrl', [
    'Realize.assignment.modal',
    'Realize.user.currentUser',
    'realize-lib.analytics.track-click',
    'Realize.common.alerts',
    'Realize.discussionPrompt.discussionPromptModel',
    'Realize.content.media-icon',
    'Realize.navigationService',
    'Realize.Comment.DisplayTime',
    'rlzComponents.components.i18n',
    'Realize.Prompt.promptApiUtilService',
    'Realize.constants.contribSource'
])
    .controller('DiscussionPromptCtrl', [
        '$scope',
        'DiscussionPromptModel',
        '$routeParams',
        '$location',
        'NavigationService',
        '$currentUser',
        'promptApiUtilService',
        '$log',
        'CONTRIBUTOR_SOURCE',
        function($scope, DiscussionPromptModel, $routeParams, $location, NavigationService, $currentUser,
            promptApiUtilService, $log, CONTRIBUTOR_SOURCE) {

            'use strict';

            var ctr = this;
            ctr.removePromptAction = false;

            $scope.currentView = $location.search().view || 'review';

            $scope.isReviewPage = function() {
                return $scope.currentView === 'review';
            };
            $scope.config = 'review';

            $scope.discussionPrompt = DiscussionPromptModel.getDisPrompt();

            ctr.displayNameForPrompt = $currentUser.userAttributes['profile.displayName'];

            ctr.getTitle = function() {
                return $scope.discussionPrompt.title;
            };

            ctr.getDescription = function() {
                return $scope.discussionPrompt.discussionPrompt;
            };

            ctr.isTeacherPrompt = function() {
                return $scope.discussionPrompt.contribSource === CONTRIBUTOR_SOURCE.MY_UPLOADS;
            };

            if (ctr.isTeacherPrompt() && $scope.discussionPrompt.status === 'DELETED') {
                var basePath = $location.path().split('discussPrompt/')[0] + 'discussPrompt';
                $location.path(basePath);
            }

            if (!!$location.search().view) {
                $scope.prompt = {
                    id: $scope.discussionPrompt.id,
                    title: $scope.discussionPrompt.title,
                    body: $scope.discussionPrompt.discussionPrompt,
                    thumbnails: $scope.discussionPrompt.thumbnailUrls[0]
                };
            }

            ctr.back = function(e) {
                e.stopPropagation();

                var path = $location.path(),
                    next;
                if (path.indexOf('discussionprompt') > -1) {
                    next = path.split('/discussionprompt/')[0];
                    NavigationService.back(next, true);
                } else {
                    next = path.split('/discussPrompt')[0] + '/discussPrompt';
                    $location.path(next).search({
                        discuss:'list',
                        activeTab:'myPrompts'
                    });
                }

            };

            $scope.$on('promptdetails.action.remove', function(e) {
                if (e) {
                    e.stopPropagation();
                }
                var path = $location.path().split('/discussPrompt')[1],
                    promptId = path.split('/')[1];
                promptApiUtilService.deletePrompt(promptId).then(function() {
                    ctr.removePromptAction = true;
                }, function(error) {
                    $log.error('Error %s in deleting the post: %s', error, prompt.id);
                });

            });

            $scope.$on('promptdetails.action.undo', function(e) {
                if (e) {
                    e.stopPropagation();
                }
                var path = $location.path().split('/discussPrompt')[1],
                    promptId = path.split('/')[1];
                promptApiUtilService.unDeletePrompt(promptId, $routeParams.classId).then(function() {
                    ctr.removePromptAction = false;
                }, function(error) {
                    $log.error('Error %s in deleting the post: %s', error, prompt.id);
                });
            });

            $scope.undoPrompt = function(event) {
                if (event) {
                    event.stopPropagation();
                }
                $scope.$emit('promptdetails.action.undo');
            };

            $scope.$on('assignmentModal.alert.toggle', function(e, args) {

                if (args.show) {
                    ctr.alertDetails = args.alertDetails;
                    ctr.alertIsSet = true;
                } else {
                    $scope.alertIsSet = false;
                }
            });

            $scope.$on('editedPrompt.alert.toggle', function(e, args) {

                if (args.show) {
                    ctr.alertDetails = args.alertDetails;
                    ctr.alertIsSet = true;
                } else {
                    $scope.alertIsSet = false;
                }
            });

            $scope.$on('prompt.mode.editing', function(event, currentView) {
                var thumbnailUrl = $scope.discussionPrompt.thumbnailUrls,
                    url = thumbnailUrl ? thumbnailUrl : $scope.discussionPrompt.url;
                $scope.prompt = {
                    id: $scope.discussionPrompt.id,
                    title: $scope.discussionPrompt.title,
                    body: $scope.discussionPrompt.discussionPrompt,
                    thumbnails: Array.isArray(url) ? url[0] : url
                };
                $scope.currentView = currentView;
            });

            $scope.$on('prompt.view.change', function(event, currentView) {
                $scope.prompt = {};
                $scope.currentView = currentView;
            });

            $scope.$on('prompt.detail.update', function(event, prompt) {
                $scope.discussionPrompt = prompt;
            });

            $scope.getContent = function() {
                return $scope.discussionPrompt;
            };
        }
    ]);
