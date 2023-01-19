angular.module('Realize.leveledReaders.leveledReadersSearch', [
    'Realize.leveledReaders.leveledReadersSvc',
    'RealizeDirectives' // for searchResults directive - - will be deprecated soon
])
    .directive('leveledReadersSearch', [
        '$log',
        '$routeParams',
        '$location',
        'LeveledReadersSvc',
        function($log, $routeParams, $location, LeveledReadersSvc) {
            'use strict';

            return {
                require: 'searchResults',
                controller: ['$scope', function($scope) {
                    var updateSearchQuery = function(scale) {
                        LeveledReadersSvc.updateRouteParams(scale);
                        $scope.searchOptions = angular.extend($scope.searchOptions,
                            LeveledReadersSvc.getQueryParam(scale));
                        $scope.searchOptions.page = 1;
                        $scope.$apply(); //apply needed for route change to take effect
                    };

                    $scope.scaleType = LeveledReadersSvc.getScaleTypeFromRoute();
                    $scope.scaleStart = LeveledReadersSvc.getScaleStartFromRoute();
                    $scope.scaleEnd = LeveledReadersSvc.getScaleEndFromRoute();

                    var timer,
                        counter = 0,
                        incrementCounter = function(scale) {
                            counter++;
                            if (counter > 10) {
                                updateSearchQuery(scale);
                                reset();
                            }
                        },
                        startInterval = function(scale) {
                            timer = setInterval(incrementCounter(scale), 100);
                        },
                        stopInterval = function() {
                            clearInterval(timer);
                        },

                        reset = function() {
                            stopInterval();
                            counter = 0;
                        };

                    $scope.$on('leveledReadersSearch.update', function(e, scale) {

                        //if there is a keyboard interaction, then delay the search once user STOPS the navigation
                        if ($scope.$root.isKeyboardInUse) {
                            reset();
                            startInterval(scale);
                        } else {
                            updateSearchQuery(scale);
                        }
                    });
                }],
                link: function($scope, $element, $attrs, searchResultsCtrl) {
                    $scope.searchOptions = searchResultsCtrl.searchOptions;
                    searchResultsCtrl.setReaderType('Leveled Readers');
                }
            };
        }]);
