angular.module('RealizeApp')
    .controller('CentersLandingCtrl', [
        '$scope',
        '$location',
        'CentersProgramListInfo',
        '$log',
        '$rootScope',
        'lwcI18nFilter',
        '$route',
        'PATH',
        function($scope, $location, CentersProgramListInfo, $log, $rootScope, lwcI18nFilter, $route, PATH) {
            'use strict';

            $scope.programs = CentersProgramListInfo.programs;

            $scope.totalMatches = CentersProgramListInfo.totalMatches;

            $scope.favoriteAttr = 'programsWithCenters.favorites';

            $scope.sortByAttr = 'programsWithCenters.defaultSort';

            $scope.$route = $route;

            //open associatedCenters
            $scope.open = function(e, program) {

                $log.debug(e, program);
                e.preventDefault();
                e.stopPropagation();

                if (program.centersProperties) {
                    var associatedCentersId = program.centersProperties.itemUuid;

                    if (associatedCentersId) {
                        //TODO: is test for blank favorite/undefined itemUuid needed?
                        $location.path(['/centers', program.id, program.version, associatedCentersId, 0].join('/'));
                    }

                    $rootScope.currentProgram = program;
                } else {
                    $log.log('No associatedCenterId id');
                }
            };

            $scope.firstVisit = {
                showAlert: !$scope.currentUser.getAttribute('centers.info.seen'),
                title: lwcI18nFilter('centers.firstVisitInfo.title'),
                description: lwcI18nFilter('centers.firstVisitInfo.description'),
                closeFn: function() {
                    $scope.currentUser.setAttribute('centers.info.seen', true);
                    $scope.firstVisit.showAlert = false;
                }
            };

            // Reviewer Logic
            if ($rootScope.currentUser.isReviewer) {
                $scope.reviewTemplate = 'templates/partials/reviewer_zero_centers.html';
                $scope.imagePath = PATH.IMAGES;
                $scope.showReviewZero = !$scope.currentUser.getAttribute('reviewer.centers.visited');
                $scope.currentUser.setAttribute('reviewer.centers.visited', true);
            } else {
                $scope.showReviewZero = false;
            }
        }
    ]);
