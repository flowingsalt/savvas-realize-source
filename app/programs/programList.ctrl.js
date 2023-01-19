angular.module('RealizeApp')
    .controller('ProgramListController', [
        '$scope',
        '$rootScope',
        '$location',
        '$route',
        '$log',
        'ProgramsListInfo',
        'Analytics',
        'PATH',
        'browseAllEventTracking',
        'browseAllService',
        function($scope, $rootScope, $location, $route, $log, ProgramsListInfo, Analytics, PATH,
            browseAllEventTracking, browseAllService) {
            'use strict';

            $scope.currentUser.setAttribute('programs.visited', true);

            $scope.programs = ProgramsListInfo.programs;

            $scope.totalMatches = ProgramsListInfo.totalMatches;

            $scope.favoriteAttr = 'programs.favorites';

            $scope.location = $location;

            $scope.sortByAttr = 'programs.defaultSort';

            $scope.$route = $route;

            // open a program, test for blank favorite
            $scope.open = function(e, program) {
                e.preventDefault();
                e.stopPropagation();

                var itemToOpen = program.$getDefaultVersion();

                if (itemToOpen.externalSource === 'NBC Learn') {
                    $location.path('/nbclearn/browse');
                } else {
                    $location.path('/program/' + itemToOpen.id + '/' + itemToOpen.version);
                }
            };

            $scope.openBrowseAllPrograms = function() {
                // Resetting browseAll components selected values.
                browseAllService.setCurrentPageIndex(1);
                browseAllService.setSelectedFacets({});
                browseAllService.setSelectedPrograms([]);
                browseAllService.setSearchKeyword('');
                browseAllEventTracking.onBrowseAllContent();
                $location.path('/browseAll');
            };

            $scope.isTeacher = function() {
                return $scope.currentUser.isTeacher;
            };

            $scope.titleSort = function(program) {
                return program.title;
            };

            $scope.shouldShowBrowseAll = function() {
                return $scope.programs.length > 0;
            };

            // Reviewer Logic
            if ($rootScope.currentUser.isReviewer) {
                $scope.reviewTemplate = 'templates/partials/reviewer_zero_programs.html';
                $scope.imagePath = PATH.IMAGES;
                $scope.showReviewZero = !$scope.currentUser.getAttribute('reviewer.programs.visited');
                $scope.currentUser.setAttribute('reviewer.programs.visited', true);
            } else {
                $scope.showReviewZero = false;
            }
        }
    ]);
