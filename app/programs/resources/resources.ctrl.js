angular.module('Realize.resources.resourcesCtrl', [
    'lst.search.widget',
    'Realize.content.model.contentItem',
    'Realize.common.resources',
    'Realize.content.contentSourceService',
    'ngRoute'
])
    .controller('ResourcesCtrl', [
        '$scope',
        '$rootScope',
        '$location',
        '$log',
        'Content',
        'ContentSource',
        '$route',
        function($scope, $rootScope, $location, $log, Content, ContentSource, $route) {
            'use strict';

            $scope.back = function() {
                if ($scope.noMatchFound) {
                    resetSearchData();
                    $route.reload();
                } else {
                    $location.path('/program');
                }
            };

            $scope.$on('searchResults.queryCompleted', function(evt, data) {
                $scope.noMatchFound = data.resultCount === 0;
            });

            var LIBRARY_TITLE = $rootScope.currentProgram.library;

            $log.debug('library context name:' + LIBRARY_TITLE);

            $scope.resourcesDefaultSearchParams = {
                'includedFacets[]': [
                    'DISTANCE_LEARNING', 'FEATURED_RESOURCES', 'GRADE', 'TEACHER_ONLY', 'RUBRIC', 'MEDIA_TYPE',
                    'CONTENT_TYPE', 'SOURCE', 'COMPREHENSION_SKILLS', 'TEXT_FEATURES', 'GENRES', 'CONTENT_AREAS',
                    'LANGUAGE'
                ],
                LIBRARY_TITLE:  LIBRARY_TITLE,
                sortField: 'relevance',
                sortOrder: 'asc',
                keywords: ''
            };

            $scope.searchParams = $scope.resourcesDefaultSearchParams;

            $scope.sortField = $scope.resourcesDefaultSearchParams.sortField;

            $scope.selectedFacets = {};

            var saveFiltersOnExit = false,
                searchProvider = ContentSource.getByPath(),
                getSearchData = function() {
                    return searchProvider.filterData.get('resources.search.keyword');
                },
                setSearchData = function(filterData) {
                    if (filterData) {
                        searchProvider = new ContentSource($scope.searchProvider);
                        searchProvider.filterData.set('resources.search.keyword', filterData);
                    }
                },
                resetSearchData = function() {
                    angular.forEach(ContentSource.PROVIDER, function(provider) {
                        provider = new ContentSource(provider);
                        provider.filterData.remove('resources.search.keyword');
                    });
                },
                initSearch = function() {
                    // to check if any selected facets & page while coming back from Item preview mode.
                    var currentSelectedData = getSearchData();
                    $log.debug('currentSelectedData', currentSelectedData);
                    if (currentSelectedData) {
                        if (currentSelectedData.selectedFacets && currentSelectedData.searchOptions) {
                            $scope.selectedFacets = currentSelectedData.selectedFacets;
                            $scope.searchParams = currentSelectedData.searchOptions;
                        } else {
                            $scope.searchParams.keywords = currentSelectedData;
                        }
                    }
                };

            $scope.$on('$locationChangeStart', function(ev, nextLocation) {
                var redirectToContentPage = nextLocation.split('/resources')[1];
                if (redirectToContentPage) {
                    saveFiltersOnExit = true;
                }
            });

            $scope.$on('searchResults.exiting', function(ev, filterData) {
                if (saveFiltersOnExit) {
                    setSearchData(filterData);
                } else {
                    resetSearchData();
                }
            });

            initSearch();
        }
    ]);
