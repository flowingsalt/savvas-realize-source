angular.module('Realize.leveledReaders.leveledReadersSearchCtrl', [
        'ngRoute',
        'Realize.leveledReaders.leveledReadersScale',
        'Realize.leveledReaders.leveledReadersSvc',
        'Realize.content.model.contentItem',
        'Realize.slider'
    ])
    .controller('LeveledReadersSearchCtrl', [
        '$scope',
        '$log',
        '$location',
        '$routeParams',
        'LeveledReadersSvc',
        'CurrentScale',
        'Content',
        'LeveledReadersScale',
        function($scope, $log, $location, $routeParams, LeveledReadersSvc, CurrentScale, Content, LeveledReadersScale) {
            'use strict';

            var leveledReadersPath = ['/program', $routeParams.programId,
                    $routeParams.programVersion, 'leveledreaders'
                ].join('/'),

                clearSearchParam = function() {
                    var path = $location.path();
                    if (path.search('leveledreaders/search/content') < 0) {
                        $location.search(LeveledReadersSvc.ROUTE_PARAM.SCALE_TYPE, null);
                        $location.search(LeveledReadersSvc.ROUTE_PARAM.START, null);
                        $location.search(LeveledReadersSvc.ROUTE_PARAM.END, null);
                    }
                },

                applyOffcenterStyle = function(scale) {
                    var offcenter = LeveledReadersScale.shouldOffcenter(scale);
                    $scope.startOffcenter = offcenter.startOffcenter;
                    $scope.endOffcenter = offcenter.endOffcenter;
                };

            $scope.navigationFallback = leveledReadersPath;

            $scope.leveledReadersDefaultSearchParams = {
                'includedFacets[]': [
                    'DISTANCE_LEARNING', 'GRADE', 'COMPREHENSION_SKILLS', 'TEXT_FEATURES', 'GENRES',
                    'CONTENT_AREAS', 'LANGUAGE', 'RUBRIC'
                ],
                'MEDIA_TYPE': 'Leveled Reader',
                sortField: 'name',
                sortOrder: 'asc'
            };

            $scope.scale = CurrentScale.$setSelectedValues(LeveledReadersSvc.getScaleStartFromRoute(),
                LeveledReadersSvc.getScaleEndFromRoute());

            $scope.searchParams = angular.extend($scope.leveledReadersDefaultSearchParams,
                LeveledReadersSvc.getQueryParam($scope.scale));

            $scope.$on('$routeChangeStart', clearSearchParam);

            $scope.$on('slider.change', function(e, scale) {
                $scope.$broadcast('leveledReadersSearch.update', scale);
                $scope.safeApply(function() {
                    applyOffcenterStyle(scale);
                });
            });

            //TODO also appears in keyboard/standard search controllers
            $scope.pageLoading(); //fixes issue where header appears for a split second before results page

            $scope.$on('searchResults.queryCompleted', function(evt, data) {
                $scope.noMatchFound = data.resultCount === 0;
            });

            $scope.selectedFacets = {};
            var saveFiltersOnExit = false;

            var initSearch = function() {
                // to check if any selected facets & page while coming back from Item preview mode.
                var currentSelectedData = Content.filterData.get('search.leveledReader');

                if (currentSelectedData) {
                    $scope.selectedFacets = currentSelectedData.selectedFacets;
                    $scope.searchParams = currentSelectedData.searchOptions;
                }
                $log.debug('initSearch', $scope.selectedFacets, $scope.searchParams);
            };

            $scope.$on('$locationChangeStart', function(ev, nextLocation, currentLocation) {
                if ((nextLocation.split('?').shift() !== currentLocation.split('?').shift()) &&
                    (nextLocation.search('leveledreaders/search/content') >= 0)) {

                    saveFiltersOnExit = true;
                }
            });

            $scope.$on('searchResults.exiting', function(ev, filterData) {
                if (saveFiltersOnExit) {
                    Content.filterData.set('search.leveledReader', filterData);
                } else {
                    Content.filterData.remove('search.leveledReader');
                }
            });

            $scope.isSelectedDraValuesEqual = function(scale) {
                return scale.isDraScale() && scale.allSelectedValuesEqual();
            };

            applyOffcenterStyle($scope.scale);
            initSearch();
        }
    ]);
