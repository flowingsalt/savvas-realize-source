angular.module('Realize.leveledReaders.leveledReadersCtrl', [
    'ngRoute',
    'rlzComponents.components.i18n',
    'Realize.leveledReaders.leveledReadersSvc',
    'Realize.leveledReaders.leveledReadersScale',
    'Realize.slider',
])
    .controller('LeveledReadersCtrl', [
        '$scope',
        '$log',
        'Messages',
        '$location',
        '$routeParams',
        'Scales',
        'LeveledReadersSvc',
        'LeveledReadersScale',
        function($scope, $log, Messages, $location, $routeParams, Scales, LeveledReadersSvc, LeveledReadersScale) {
            'use strict';

            $scope.firstVisit = {
                showAlert: !$scope.currentUser.getAttribute('leveledReaders.info.seen'),
                title: Messages.getMessage('leveledReaders.firstVisit.title'),
                description: Messages.getMessage('leveledReaders.firstVisit.description'),

                closeFn: function() {
                    $scope.currentUser.setAttribute('leveledReaders.info.seen', true);
                    $scope.firstVisit.showAlert = false;
                }
            };

            $scope.scales = Scales;

            $scope.expand = function(scale) {
                $scope.openScale = ($scope.openScale !== scale) ? scale : null;
                $scope.$broadcast('slider.resetSliderValues');
            };

            $scope.getSearchResult = function(scale) {
                LeveledReadersSvc.redirectToSearchPage(scale);
            };

            $scope.back = function() {
                $location.path('/program', true);
            };

            $scope.isSelectedDraValuesEqual = function(scale) {
                return scale.isDraScale() && scale.allSelectedValuesEqual();
            };

            $scope.$on('slider.change', function() {
                $scope.safeApply(function() {
                    var offcenter = LeveledReadersScale.shouldOffcenter($scope.openScale);
                    $scope.startOffcenter = offcenter.startOffcenter;
                    $scope.endOffcenter = offcenter.endOffcenter;
                });
            });
        }]);
