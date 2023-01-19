angular.module('RealizeApp')
    .controller('KeywordSearchCtrl', [
        '$scope',
        '$log',
        '$location',
        '$rootScope',
        'ContentSource',
        'lwcI18nFilter',
        '$routeParams',
        'ExternalItemStrategy',
        function($scope, $log, $location, $rootScope, ContentSource, lwcI18nFilter, $routeParams,
            ExternalItemStrategy) {
            'use strict';

            $scope.pageLoading();
            $scope.searchInitialized = false;
            var queryString = $location.search();
            $scope.keywords = $scope.zeroStateMsgCriteria = queryString.keywords;

            // used to style selected sort type
            $scope.sortBy = 'relevance';

            // used to style the global keyword search input
            $scope.searchInputFocused = false;

            $scope.searchParams = {};
            $scope.selectedFacets = {};

            var searchParams = {
                    keywords: $scope.keywords,
                    sortField: 'relevance',
                    sortOrder: 'asc'
                },
                path = $location.path(),
                searchProvider = ContentSource.getByPath(),
                saveFiltersOnExit = false,
                externalItemService = ExternalItemStrategy.getInstance(path);

            if (angular.isDefined(externalItemService)) {
                $scope.externalSearchProviderName = externalItemService.getProviderName();
                $scope.searchProvider = $scope.externalSearchProviderName;
            } else {
                $scope.searchProvider = ContentSource.PROVIDER.REALIZE;
            }

            if ($rootScope.currentUser.isStudent) {
                searchParams.NOT_HIDE_FROM_STUDENT = 'Yes';
            }

            function setHideExternalProviderSearchTip(value) {
                $scope.hideExternalProviderSearchTip = value;
            }

            if ($scope.searchProvider !== ContentSource.PROVIDER.REALIZE) {
                var dismissTipsUserAttribute = externalItemService.getDismissTipsUserAttribute();
                setHideExternalProviderSearchTip($scope
                                        .currentUser
                                        .getAttribute(dismissTipsUserAttribute));
            }

            $scope.hideExternalProviderSearchTips = function() {
                var dismissTipsUserAttribute = externalItemService.getDismissTipsUserAttribute();
                $scope.currentUser.setAttribute(dismissTipsUserAttribute, true);
                $log.debug('external provider search tips dismissed forever...');
                setHideExternalProviderSearchTip(true);
            };

            $scope.firstVisit = {
                showAlert: function() {
                    return $scope.searchProvider !== ContentSource.PROVIDER.REALIZE &&
                        !$scope.hideExternalProviderSearchTip;
                },
                title: lwcI18nFilter('keywordSearch.tipsForSearchingWithOpenEd.title'),
                description: lwcI18nFilter('keywordSearch.tipsForSearchingWithOpenEd.message'),
                closeFn: $scope.hideExternalProviderSearchTips
            };

            var getSearchData = function() {
                return searchProvider.filterData.get('search.keyword');
            };

            var setSearchData = function(filterData) {
                if (filterData) {
                    $log.debug('searchProvider ' + searchProvider.name + ' save', filterData);
                    searchProvider = new ContentSource($scope.searchProvider);
                    searchProvider.filterData.set('search.keyword', filterData);
                }
            };

            var resetSearchData = function() {
                $log.debug('initSearch: Reset Search Data');
                angular.forEach(ContentSource.PROVIDER, function(provider) {
                    provider = new ContentSource(provider);
                    provider.filterData.remove('search.keyword');
                });
            };

            $scope.setSortField = function(sortBy, event) {
                if (event) {
                    event.stopPropagation();
                    event.preventDefault();
                }
                $scope.sortBy = sortBy;
            };

            var initSearch = function() {
                // to check if any selected facets & page while coming back from lesson/test edit/read only mode.
                var currentSelectedData = getSearchData();
                if (currentSelectedData && currentSelectedData.searchOptions &&
                    $routeParams.keywords !== currentSelectedData.searchOptions.keywords) {
                    resetSearchData();
                    currentSelectedData = getSearchData();
                }

                if (currentSelectedData) {
                    $scope.selectedFacets = currentSelectedData.selectedFacets;
                    $scope.searchParams = currentSelectedData.searchOptions;
                    $scope.setSortField(currentSelectedData.searchOptions.sortField);
                } else {
                    $scope.searchParams = searchParams;
                }
                $log.debug('initSearch', $scope.selectedFacets, $scope.searchParams);
            };

            $scope.$on('searchResults.queryCompleted', function(evt, data) {
                $scope.noMatchFound = data.resultCount === 0;
            });

            $scope.$on('searchResults.searchProvider.toggled', function(ev, provider) {
                saveFiltersOnExit = true;
                var searchPathMapByProvider = ContentSource.PROVIDER.PATH,
                    searchPath = searchPathMapByProvider[provider];
                $location.path(searchPath).search({keywords: $scope.searchParams.keywords});
            });

            $scope.$on('$locationChangeStart', function(ev, nextLocation, currentLocation) {
                if (nextLocation.split('?').shift() !== currentLocation.split('?').shift()) {
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

            $scope.isExternalSearchProviderMode = function() {
                return angular.isDefined($scope.externalSearchProviderName) &&
                    ($scope.searchProvider === $scope.externalSearchProviderName);
            };

            initSearch();
        }
    ]);
