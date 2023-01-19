angular.module('Realize.Discussions.Create', [
    'Discuss.CreateView',
    'Realize.common.alerts'
])
    .controller('DiscussCreateCtrl', [
        '$scope',
        '$routeParams',
        '$log',
        'InlineAlertService',
        'Messages',
        '$location',
        'DiscussNavigation',
        '$filter',
        'Analytics',
        '$timeout',
        '$window',
        'BrowserInfo',
        'lwcI18nFilter',
        function($scope, $routeParams, $log, InlineAlertService, Messages, $location, DiscussNavigation,
            $filter, Analytics, $timeout, $window, BrowserInfo, lwcI18nFilter) {
            'use strict';
            var ctrl = this;
            $scope.boardId = $location.search().boardId;
            $scope.classId = $routeParams.classId;
            $scope.isSaveErrorMessageVisible = false;
            $scope.isLoading = false;

            if (BrowserInfo.OS.isIOS) {
                $timeout(function() {
                    $window.scrollTo(0, 240);
                }, 1000);
            }

            $scope.$on('discussion.create-view.saveButtonClicked', function() {
                if ($scope.createPostForm && $scope.createPostForm.$valid && $scope.savePressed) {
                    $scope.isLoading = true;
                }
            });

            $scope.$on('discussion.create-view.saveSuccessful', function(e, post) {
                var successAlert = {
                    type: 'success',
                    msg: [
                        lwcI18nFilter($scope.sanitizeCode('discussion.list.successNotification.title')),
                        lwcI18nFilter($scope.sanitizeCode('discussion.list.successNotification.message'))
                    ].join(' ')
                };
                Analytics.track('track.action', {
                    category:   'Classes',
                    action:     'Discuss',
                    label:      'Start'
                });

                InlineAlertService.addAlert(post.id, successAlert);
                DiscussNavigation.goToList(post.boardId);
                $scope.isLoading = false;
            });

            $scope.$on('discussion.create-view.saveFailed', function(e, err) {
                $scope.isLoading = false;
                $scope.isSaveErrorMessageVisible = true;
                $log.error('Error saving!', err);
            });

            ctrl.back = function() {
                $log.log('GO BACK');

                if ($location.search().state === 'zeroPost') {
                    DiscussNavigation.back();
                } else {
                    DiscussNavigation.goToList($scope.boardId);
                }
            };

            // Back Button
            $scope.$on('discussion.create-view.goBack', ctrl.back);

            // Cancel Button
            $scope.$on('discussion.create-view.cancelButtonClicked', ctrl.back);
        }]);
