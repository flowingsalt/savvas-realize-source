angular.module('RealizeApp')
    .controller('ReviewerProgramListCtrl', [
        '$scope',
        '$rootScope',
        '$location',
        '$route',
        '$log',
        'ProgramsListInfo',
        'PATH',
        '$anchorScroll',
        'lwcI18nFilter',
        function($scope, $rootScope, $location, $route, $log, ProgramsListInfo, PATH, $anchorScroll, lwcI18nFilter) {
            'use strict';

            $scope.currentUser.setAttribute('programs.visited', true);

            $scope.programs = ProgramsListInfo.programs;

            $scope.totalMatches = ProgramsListInfo.totalMatches;

            $scope.favoriteAttr = 'programs.favorites';

            $scope.location = $location;

            $scope.sortByAttr = 'programs.defaultSort';

            $scope.$route = $route;

            $scope.firstVisit = {
                showAlert: !$scope.currentUser.getAttribute('review.info.seen'),
                title: lwcI18nFilter('review.firstVisitInfo.title'),
                description: lwcI18nFilter('review.firstVisitInfo.description'),
                closeFn: function() {
                    $scope.currentUser.setAttribute('review.info.seen', true);
                    $scope.firstVisit.showAlert = false;
                }
            };

            // open a program, test for blank favorite
            $scope.open = function(e, program) {
                e.preventDefault();
                e.stopPropagation();

                var itemToOpen = program.$getDefaultVersion();
                $location.path('/review/program/' + itemToOpen.id + '/' + itemToOpen.version + '/standards');
            };

            $scope.titleSort = function(program) {
                return program.title;
            };
        }
    ]);
