angular.module('Realize.Discussions.List', [
    'Discuss.ListView',
    'Realize.Discussions.CustomPostSummary'
])
    .controller('DiscussListCtrl', [
        '$rootScope',
        '$scope',
        '$routeParams',
        '$location',
        '$log',
        'DiscussNavigation',
        'Analytics',
        function($rootScope, $scope, $routeParams, $location, $log, DiscussNavigation, Analytics) {
            'use strict';
            $scope.classId = $routeParams.classId;
            $scope.boardId = $location.search().boardId;
            $scope.zeroStateForStudent = false;
            $scope.isLoading = true;

            $scope.$on('discussion.list-view.zeroState', function() {
                $scope.isLoading = false;
                if ($rootScope.currentUser.isStudent) {
                    $scope.zeroStateForStudent = true;
                } else {
                    DiscussNavigation.goToCreate($scope.boardId);
                    $location.search('state', 'zeroPost');
                }
            });

            $scope.$on('discussion.list-view.notFound', function() {
                $scope.isLoading = false;
                if ($rootScope.currentUser.isStudent) {
                    $scope.zeroStateForStudent = true;
                } else {
                    DiscussNavigation.goToCreate($scope.boardId);
                }
            });

            $scope.$on('discussion.list-view.postClick', function(e, post) {
                Analytics.track('track.action', {
                    category:   'Classes',
                    action:     'Discuss',
                    label:      'Open ' + post.title
                });
                DiscussNavigation.goToPost($scope.boardId, post.id);
            });

            $scope.$on('discussion.list-view.createClick', function() {
                DiscussNavigation.goToCreate($scope.boardId);
            });

            $scope.$on('discussion.list-view.goBack', function() {
                DiscussNavigation.back();
            });

            $scope.$on('discussion.list-view.success', function() {
                $scope.isLoading = false;
            });

            $scope.$on('discussion.create-view.saveSuccessful', function() {
                $scope.isLoading = true;
            });
        }
    ]);
