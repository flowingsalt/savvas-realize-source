angular.module('RealizeDirectives')
    .controller('SearchResultsCtrl', [
        '$scope',
        '$element',
        '$attrs',
        '$location',
        'ContentSource',
        '$rootScope',
        'Messages',
        'RealizeHelpers',
        'BrowserInfo',
        '$timeout',
        'SearchSvc',
        '$routeParams',
        'QL_MAX_LINKS',
        'OPEN_ED_LINKS',
        'PATH',
        'ProgramService',
        'lwcI18nFilter',
        'LeveledReadersSvc',
        'telemetryService',
        'baseTelemetryEvents',
        'TELEMETRY_CONSTANTS',
        'LEXILE_TELEMETRY',
        'DRA_TELEMETRY',
        'featureManagementService',
        function($scope, $element, $attrs, $location, ContentSource, $rootScope, Messages, helpers,
            BrowserInfo, $timeout, SearchSvc, $routeParams, QL_MAX_LINKS, OPEN_ED_LINKS, PATH, ProgramService,
            lwcI18nFilter, LeveledReadersSvc, telemetryService, baseTelemetryEvents, TELEMETRY_CONSTANTS,
            LEXILE_TELEMETRY, DRA_TELEMETRY, featureManagementService) {
            'use strict';

            var eventTriggerSource = LEXILE_TELEMETRY.EMPTY_STRING;

            if (angular.isDefined($scope.active) && !$scope.active) {
                $element.remove();
                return;
            }

            $scope.$on('resourcesGridView.facet.filter.triggered', function(event, selectedResourceValue) {
                $scope.$broadcast('searchResults.facet.filter.toggled', selectedResourceValue);
            });

            $scope.location = $location;

            $scope.isStudent = $rootScope.currentUser.isStudent;

            $scope.getMessage = Messages.getMessage;

            $scope.isOpenedEnabled = featureManagementService.isLtiOpenEdUrlEnabled();

            $scope.QL_MAX_LINKS = QL_MAX_LINKS;
            $scope.OPEN_ED_LINKS = OPEN_ED_LINKS;

            //resource page related variables.
            var featuredResourcesBasePath = 'realizeit/skins/default/images/featuredResources/',
                defaultFilename = 'featured_resources_default_icon',
                fileExtension = '.png',
                fileNameSuffix = '';
            fileNameSuffix = BrowserInfo.isHDDisplay ? '@2x' : '@1x';
            $scope.fallback = featuredResourcesBasePath + defaultFilename + fileNameSuffix + fileExtension;
            $scope.basePath = [PATH.SHARED_THUMBNAILS, 'featured_resources'].join('/');
            $scope.resources = [];

            var ctrl = this,
                searchProvider = new ContentSource($scope.searchProvider),
                initialSearch = {},
                extraData = {},
                doSearchCalled,
                NOT_MEDIA_TYPE = [
                    'Teacher Support', 'Tier', 'Remediation', 'Learning Model',
                    'Student Voice', 'Center Container', 'Tools'];

            ctrl.searchOptions = $scope.searchOptions;

            if (angular.isUndefined($scope.searchOptions)) {
                $scope.searchOptions = {
                    facets: {},
                    page: 1
                };
            } else if (angular.isUndefined($scope.searchOptions.facets)) {
                $scope.searchOptions.facets = {};
            }

            if (angular.isUndefined($scope.selectedFacets)) {
                $scope.selectedFacets = {};
            }

            if (angular.isUndefined($scope.selectedSearchItems)) {
                $scope.selectedSearchItems = {
                    ids: {},
                    objects: []
                };
            }

            var resetSearchInfo = function() {
                $scope.delayingSearch = false;
                $scope.queryDone = false;
                $scope.results = [];
                $scope.startIndex = 1;
                $scope.endIndex = 10;
                $scope.pageSize = 10;
                $scope.totalMatches = 10;
                $scope.currentPage = $scope.searchOptions.page || 1;
                $scope.facets = [];
                $scope.externalSearchProviderDown = false;
            };

            $scope.readerType = false;
            ctrl.setReaderType = function(str) {
                $scope.readerType = str;
            };

            ctrl.isInitialSearch = function() {
                if (angular.isUndefined(initialSearch[$scope.searchProvider])) {
                    initialSearch[$scope.searchProvider] = true;
                }
                return initialSearch[$scope.searchProvider];
            };

            var performedInitialSearch = function() {
                initialSearch[$scope.searchProvider] = false;
            };

            $scope.showMultiSelectItem = angular.isDefined($attrs.showmultiselectitem);
            $scope.showPrimaryLinks = angular.isDefined($attrs.showprimarylinks);
            $scope.showAddItemLinks = angular.isDefined($attrs.showadditemlinks); //edit lesson specific
            $scope.isStandardSearch = angular.isDefined($attrs.standardssearch);

            resetSearchInfo();
            $scope.pageLoaded = false;

            var removeQueryDoneWatch = $scope.$watch('queryDone', function(finished) {
                var path = $location.path();
                if (finished || path.search('/reorder') >= 0) {
                    $rootScope.pageLoaded();
                    $scope.pageLoaded = true;
                    removeQueryDoneWatch();
                }
            });

            ctrl.updateResultCountIndexes = function() {
                var newIndexes = SearchSvc.calculateResultCountIndexes(
                        $scope.pageSize, $scope.currentPage, $scope.totalMatches
                    );
                $scope.startIndex = newIndexes.start;
                $scope.endIndex = newIndexes.end;
            };

            var notifyQueryIsComplete = function() {
                $scope.$emit('searchResults.queryCompleted', {
                    resultCount: $scope.totalMatches
                });
                $scope.queryDone = true;
            };

            var searchCallback = function(response, callback) {
                callback = callback || angular.noop;
                $scope.facets = SearchSvc.sortFacets(response.facets);

                //if it is a featured resource home page, delete the library title facet and collect featured resources.
                if ($scope.inResourcePage() && ($location.path().search('/lesson') < 0)) {
                    $scope.modifyFacetList();
                }

                var facetMap = SearchSvc.getFacetMap($scope.facets);

                angular.forEach($scope.selectedFacets, function(facet) {
                    angular.forEach(facet, function(value) {
                        if (facetMap[value.facet] && facetMap[value.facet][value.value]) {
                            value.count = facetMap[value.facet][value.value].count;
                        }
                    });
                });
                $scope.results = SearchSvc.groupResults(response.results, 'searchGroupNum');
                ProgramService.getAllPrograms()
                    .then(function(data) {
                        var subscribedPrograms = data.results ? data.results : [];
                        angular.forEach($scope.results, function(result) {
                            result.breadcrumbList = (result.fromDetailsTrees && result.fromDetailsTrees.length > 0) ?
                                SearchSvc.getBreadcrumbHierarchy(result.fromDetailsTrees, subscribedPrograms) : [];
                        });
                    });

                $scope.results = SearchSvc.addMyContent($scope.results);
                $scope.totalMatches = response.totalMatches;
                $scope.noMatchFound = ($scope.totalMatches === 0);

                if ($scope.noMatchFound && $scope.isExternalSearchProviderMode()) {
                    $scope.$broadcast('searchInput.clear');
                }

                ctrl.updateResultCountIndexes();
                notifyQueryIsComplete();

                callback();
                if ($rootScope.viewLoading) {
                    $rootScope.pageLoaded();
                }
            };

            var buildLexileTelemetryData = function(lexileDescription, definitionName, subPage) {
                var lexileTelemetryEventObject = {
                    extensions: {
                        area: TELEMETRY_CONSTANTS.EVENT_TYPE.PROGRAMS,
                        page: LEXILE_TELEMETRY.LEVELED_READERS,
                        product: LEXILE_TELEMETRY.EMPTY_STRING,
                        description: lexileDescription,
                        value: $scope.searchOptions[LEXILE_TELEMETRY.LEXILE.toUpperCase()]
                    },
                    definition: {
                        name: definitionName
                    }
                };

                lexileTelemetryEventObject.extensions['sub-page'] = subPage;

                return lexileTelemetryEventObject;
            };

            //send telemetry  Events...
            var sendTelemetryEvent = function(lexileSearchVerb) {
                var verb, description, definitionName, subPage;
                if (eventTriggerSource === LEXILE_TELEMETRY.LEXILE_SCALE_SEARCH) {
                    verb = lexileSearchVerb;
                    description = LEXILE_TELEMETRY.DESCRIPTION_WITHOUT_FILTER;
                    definitionName = LEXILE_TELEMETRY.LEXILE_SEARCH;
                    subPage = LEXILE_TELEMETRY.LEXILE_SCALE;
                } else if (eventTriggerSource === LEXILE_TELEMETRY.FACET_CHANGE_EVENT) {
                    verb = TELEMETRY_CONSTANTS.EVENT_TYPE.FILTER;
                    description = LEXILE_TELEMETRY.DESCRIPTION_WITH_FILTER;
                    definitionName = LEXILE_TELEMETRY.LEXILE_FACET;
                    subPage = TELEMETRY_CONSTANTS.EVENT_TYPE.FACET_PANEL;
                }

                eventTriggerSource = LEXILE_TELEMETRY.EMPTY_STRING;
                var lexileTelemetryEvent = baseTelemetryEvents.createEventData(verb,
                    buildLexileTelemetryData(description, definitionName, subPage));
                telemetryService.sendTelemetryEvent(lexileTelemetryEvent);
            };

            var doSearch = function(callback) {
                var isInitialSearch = ctrl.isInitialSearch();
                if (isInitialSearch) {
                    $rootScope.pageLoading();
                    performedInitialSearch();
                }
                if (LeveledReadersSvc.getScaleTypeFromRoute() === LEXILE_TELEMETRY.LEXILE) {
                    eventTriggerSource = eventTriggerSource.length === 0 ?
                        LEXILE_TELEMETRY.LEXILE_SCALE_SEARCH : eventTriggerSource;
                    var lexileSearchVerb = isInitialSearch && eventTriggerSource ===
                        LEXILE_TELEMETRY.LEXILE_SCALE_SEARCH  ?
                        TELEMETRY_CONSTANTS.EVENT_TYPE.SEARCH : TELEMETRY_CONSTANTS.EVENT_TYPE.FILTER;
                    sendTelemetryEvent(lexileSearchVerb);
                } else if (LeveledReadersSvc.getScaleTypeFromRoute() === DRA_TELEMETRY.DRA) {
                    eventTriggerSource = eventTriggerSource.length === 0 ?
                        DRA_TELEMETRY.DRA_SCALE_SEARCH : eventTriggerSource;
                    var draSearchVerb = (isInitialSearch && eventTriggerSource ===
                        DRA_TELEMETRY.DRA_SCALE_SEARCH)  ?
                        TELEMETRY_CONSTANTS.EVENT_TYPE.SEARCH : TELEMETRY_CONSTANTS.EVENT_TYPE.FILTER;
                    sendDraTelemetryEvent(draSearchVerb);
                }

                if (doSearchCalled) {
                    $timeout.cancel(doSearchCalled);
                    doSearchCalled = false;
                }

                $scope.queryDone = false;
                $scope.externalSearchProviderDown = false;
                var params = angular.copy($scope.searchOptions);

                // put facets on the same level as other
                // search options for the rest call
                delete params.facets;
                angular.extend(params, $scope.searchOptions.facets);

                searchProvider.updateMultiValueFacets(params);

                var defaultParams = {
                    pageSize: $scope.pageSize,
                    levels: 0, // TODO: does this even matter with fast search?
                    NOT_ITEM_STATUS: ['deleted', 'archived'],
                    NOT_MEDIA_TYPE: NOT_MEDIA_TYPE,
                    'includedFacets[]': SearchSvc.INCLUDED_FACETS,
                    realizeSearch: true
                };

                if ($scope.isStudent) {
                    defaultParams.NOT_MEDIA_TYPE.push('Center');
                }

                var allParams = angular.extend({}, defaultParams, params);

                searchProvider.query(allParams).then(function(response) {
                    searchCallback(response, callback);
                }, function() {
                    if ($scope.isExternalSearchProviderMode()) {
                        $scope.externalSearchProviderDown = true;
                        $scope.totalMatches = 0;
                        $scope.noMatchFound = true;
                        notifyQueryIsComplete();
                        if ($rootScope.viewLoading) {
                            $rootScope.pageLoaded();
                        }
                    } else {
                        $rootScope.goToDefaultErrorPage();
                    }
                });
            };

            var callDoSearch = function() {
                doSearchCalled = $timeout(doSearch, 500);
            };

            var buildDraTelemetryData = function(definitionName, subPage) {
                var draTelemetryEventObject = {
                    extensions: {
                        area: TELEMETRY_CONSTANTS.EVENT_TYPE.PROGRAMS,
                        page: DRA_TELEMETRY.LEVELED_READERS,
                        'sub-page': subPage,
                        product: LeveledReadersSvc.getProgramTitle(),
                        description: DRA_TELEMETRY.DESCRIPTION,
                        LeveledReaderType: DRA_TELEMETRY.DRA,
                        LeveledReaderScale: $scope.searchOptions[DRA_TELEMETRY.DRA.toUpperCase()]
                    },
                    definition: {
                        name: definitionName
                    }
                };

                return draTelemetryEventObject;
            };

            var sendDraTelemetryEvent = function(draSearchVerb) {
                var verb, definitionName, subPage;
                if (eventTriggerSource === DRA_TELEMETRY.DRA_SCALE_SEARCH) {
                    verb = draSearchVerb;
                    if (draSearchVerb === TELEMETRY_CONSTANTS.EVENT_TYPE.SEARCH) {
                        definitionName = DRA_TELEMETRY.DRA_SCALE_SEARCH;
                        subPage = DRA_TELEMETRY.DRA_SCALE;
                    } else if (draSearchVerb === TELEMETRY_CONSTANTS.EVENT_TYPE.FILTER) {
                        subPage = DRA_TELEMETRY.DRA_SEARCH_RESULTS;
                        definitionName = DRA_TELEMETRY.REFINE_DRA_SCALE;
                    }
                    var draTelemetryEvent = baseTelemetryEvents.createEventData(verb,
                        buildDraTelemetryData(definitionName, subPage));
                    telemetryService.sendTelemetryEvent(draTelemetryEvent);
                }
                eventTriggerSource = LEXILE_TELEMETRY.EMPTY_STRING;
            };

            //Edit Lesson specific - used to preselect the Library Name from facet list
            ctrl.inferSelectedFacets = function() {
                var allFacetsList = $scope.facets,
                    searchOptionsFacets = angular.copy($scope.searchOptions.facets),
                    selectedFacets = {};

                angular.forEach(allFacetsList, function(facet) {
                    var selectedValuesForFacet = searchOptionsFacets[facet.fieldName];
                    if (selectedValuesForFacet) {
                        if (!selectedFacets[facet.fieldName]) {
                            selectedFacets[facet.fieldName] = [];
                        }

                        angular.forEach(selectedValuesForFacet, function(selectedFacetValue) {
                            var facetValueObject = _.findWhere(facet.values, {
                                'value': selectedFacetValue
                            });
                            if (facetValueObject) {
                                selectedFacets[facet.fieldName].push(facetValueObject);
                            }
                        });
                    }
                });

                angular.extend($scope.selectedFacets, selectedFacets);
            };

            $scope.loadingResults = function() {
                return $scope.results.length && !$scope.queryDone;
            };

            //Edit Lesson specific
            $scope.removeSelectedItems = function(e, itemId) {
                helpers.killEvent(e);
                $scope.selectedSearchItems.ids[itemId] = false;
                $scope.selectedSearchItems.objects = _.reject($scope.selectedSearchItems.objects, function(item) {
                    return item.id === itemId;
                });
            };

            //Edit Lesson specific
            $scope.updateSelectedResults = function(checkboxId, checked) {
                if (checked) {
                    var searchItem = _.find($scope.results, function(item) {
                        return item.id === checkboxId;
                    });
                    $scope.selectedSearchItems.objects.push(searchItem);
                } else {
                    $scope.selectedSearchItems.objects = _.reject($scope.selectedSearchItems.objects, function(item) {
                        return item.id === checkboxId;
                    });
                }
            };

            $scope.skipFacets = function(event) {
                event.stopPropagation();
                $('#resultsSkipTarget').next('div').find(':focusable').first().focus();
            };

            // open a from link
            $scope.openFrom = function(e) {
                helpers.killEvent(e);
                // removed per Business; too many paths (lessons, books, etc) so the links were breaking
                // $location.path(detail.path);
            };

            //edit lesson specific
            $scope.showSearchProvidersInZeroState = function() {
                return $scope.addItemSearchResults && ($scope.noMatchFound || $scope.delayingSearch);
            };

            //edit lesson specific
            $scope.showExternalProviderSearchForm = function() {
                return $scope.addItemSearchResults &&
                    ($scope.searchProvider !== ContentSource.PROVIDER.REALIZE);
            };

            //edit lesson specific
            $scope.inExternalProviderZeroState = function() {
                return $scope.delayingSearch && $scope.showExternalProviderSearchForm();
            };

            $scope.inResourcePage = function() {
                return $scope.location.path().search('/resources') >= 0;
            };

            $scope.isSearchResultPage = function() {
                return $scope.inResourcePage() && $scope.searchOptions.keywords !== '';
            };

            $scope.hasFacetSelected = function() {
                return _.find($scope.selectedFacets, function(facet) {
                    return facet.length > 0;
                }) !== undefined;
            };

            $scope.showResourceSearchList = function() {
                return $scope.searchOptions.keywords !== '' || $scope.hasFacetSelected() ||
                    $scope.resources.length === 0;
            };

            $scope.noMatchToggle = function(searchPath) {
                $location.path(searchPath).search({keywords: $scope.searchOptions.keywords});
            };

            $scope.goToPrograms = function() {
                $location.path('/program');
            };

            var prevSearchProvider = $scope.searchProvider; //init

            $scope.toggleSearchProvider = function(event, provider) {
                helpers.killEvent(event);
                prevSearchProvider = $scope.searchProvider;
                $scope.$emit('searchResults.searchProvider.toggled', provider);
            };

            $scope.showSearchResults = function() {
                return (!$scope.noMatchFound && !$scope.delayingSearch) || $scope.inResourcePage();
            };

            $scope.showSearchResultsList = function() {
                return !$scope.inResourcePage() || $scope.showResourceSearchList();
            };

            $scope.showResourcesThumbnails = function() {
                return $scope.inResourcePage() && !$scope.showResourceSearchList();
            };

            $scope.modifyFacetList = function() {
                angular.forEach($scope.facets, function(facet) {
                    if (facet.fieldName === 'FEATURED_RESOURCES') {
                        $scope.setResources(facet.values);
                    }
                    if (facet.fieldName === 'LIBRARY_TITLE') {
                        $scope.facets.splice($scope.facets.indexOf(facet), 1);
                    }
                });
            };

            $scope.setResources = function(featuredResourceValues) {
                $scope.resources.length = 0;
                angular.forEach(featuredResourceValues, function(featuredResource) {
                    if (featuredResource) {
                        $scope.resources.push(featuredResource);
                    }
                });
            };

            $scope.setKeywords = function(keywords) {
                if ($scope.isExternalSearchProviderMode()) {
                    $scope.delayingSearch = false;
                    angular.copy({}, $scope.selectedFacets);
                    if ($scope.noMatchFound) {
                        initialSearch[$scope.searchProvider] = true;
                    }
                }
                $scope.searchOptions.page = 1;
                if ($scope.searchOptions.keywords === keywords) {
                    //force new search
                    doSearch(angular.noop);
                } else {
                    $scope.searchOptions.keywords = keywords;
                }
            };

            $rootScope.$on('selectedFacetList.clearAll', function() {
                if ($scope.isStudent) {
                    NOT_MEDIA_TYPE.push('Center');
                }
                if ($scope.searchOptions.LIBRARY_TITLE) {
                    if (!$scope.searchOptions.NOT_MEDIA_TYPE) {
                        $scope.searchOptions.NOT_MEDIA_TYPE = [];
                    }
                    angular.copy(NOT_MEDIA_TYPE, $scope.searchOptions.NOT_MEDIA_TYPE);
                }
                angular.copy({}, $scope.selectedFacets);
            });

            $rootScope.$on('facinator.exiting', function(ev, info) {
                extraData.facets = info;
            });

            $scope.$on('$locationChangeStart', function() {
                // send info about the current state before leaving
                $scope.$emit('searchResults.exiting', {
                    selectedFacets: angular.copy($scope.selectedFacets),
                    searchOptions: angular.copy($scope.searchOptions),
                    page: $scope.currentPage,
                    additionalData: extraData
                });
            });

            $scope.$watch('currentPage', function(page, old) {
                if (page !== old && page !== $scope.searchOptions.page) {
                    ctrl.updateResultCountIndexes();
                    $scope.searchOptions.page = page;
                }
            });

            $scope.$watch('selectedFacets', function(facets, old) {
                var facetsChanged = old && !angular.equals(facets, old);
                if (facetsChanged) {
                    var selectedFacets = helpers.convertFacetsToParams(facets);
                    if (ctrl.isInitialSearch()) {
                        $.extend($scope.searchOptions.facets, selectedFacets);
                    } else {
                        angular.copy(selectedFacets, $scope.searchOptions.facets);

                        if (prevSearchProvider === $scope.searchProvider) {
                            $scope.searchOptions.page = 1;
                        }
                        eventTriggerSource = LEXILE_TELEMETRY.FACET_CHANGE_EVENT;
                    }
                }
            }, true);

            $scope.$watch('sortField', function(field, previous) {
                if (field && field !== previous) {
                    $scope.searchOptions.sortField = field;
                    $scope.searchOptions.sortOrder = 'asc';
                }
            });

            $scope.$watch('searchProvider', function(newProvider, oldProvider) {
                if (newProvider && newProvider !== oldProvider) {
                    prevSearchProvider = newProvider;
                    searchProvider = new ContentSource($scope.searchProvider);
                    resetSearchInfo();
                    if ($scope.addItemSearchResults && ctrl.isInitialSearch() &&
                        ($scope.isExternalSearchProviderMode())) {
                        $scope.delayingSearch = true;
                    } else {
                        // switching providers we have to wait results to load so we show a spinner
                        $rootScope.pageLoading();
                        callDoSearch();
                    }
                }
            }, true);

            $scope.$watch('searchOptions', function(newOptions, oldOptions) {
                if (_.size(newOptions) && !$scope.delayingSearch) {
                    var callback = angular.noop;
                    if (ctrl.isInitialSearch() && $scope.addItemSearchResults &&
                        ($scope.searchProvider === ContentSource.PROVIDER.REALIZE) &&
                        (newOptions.facets.LIBRARY_TITLE !== undefined)) {
                        $scope.zeroStateMsgCriteria = newOptions.facets.LIBRARY_TITLE[0];
                        callback = ctrl.inferSelectedFacets;
                    }

                    if (newOptions.LEXILE !== oldOptions.LEXILE) {
                        eventTriggerSource = LEXILE_TELEMETRY.LEXILE_SCALE_SEARCH;
                    } else if (newOptions.DRA !== oldOptions.DRA) {
                        eventTriggerSource = DRA_TELEMETRY.DRA_SCALE_SEARCH;
                    }

                    $scope.currentPage = newOptions.page || 1;
                    doSearch(callback);
                }
            }, true);

            $scope.tmplUrls = {
                externalProviderSearchForm: 'templates/partials/openEdSearchForm.html',
                providerToggle: 'templates/partials/searchProviderToggle.html'
            };

            $scope.getKeywordsIfSearchIsNotEmpty = function() {
                return $scope.showSearchResults() ? $scope.searchOptions.keywords : undefined;
            };

            $scope.redirectToLeveledReader = function() {
                var leveledReadersPath = [
                    '/program', $routeParams.programId, $routeParams.programVersion, 'leveledreaders'
                ].join('/');
                $location.path(leveledReadersPath).replace();
            };

            $scope.resourcesSearch = function(searchKeyword) {
                $scope.searchOptions.keywords = searchKeyword;
                $scope.$emit('searchResults.searchButton.triggered');
            };

            $scope.clearSearch = function() {
                $scope.searchOptions.keywords = '';
            };

            $scope.searchTitle = lwcI18nFilter('resources.searchTitle');
            $scope.searchButtonName = lwcI18nFilter('resources.searchBtnText');

            if ($scope.inResourcePage() && $scope.searchOptions.keywords) {
                $scope.initialSearchKeyword = $scope.searchOptions.keywords;
            }

            $scope.isExternalSearchProviderMode = function() {
                return angular.isDefined($scope.externalSearchProviderName) &&
                    ($scope.searchProvider === $scope.externalSearchProviderName);
            };
        }
    ])
    .directive('searchResults', [
        function() {
            'use strict';

            return {
                replace: true,
                scope: {
                    sortField: '=',
                    addItemSearchResults: '=?addItemSearch',
                    selectedSearchItems: '=?',
                    searchProvider: '=',
                    searchOptions: '=',
                    selectedFacets: '=',
                    externalSearchProviderName: '='
                },
                templateUrl: function(el, attrs) {
                    return attrs.template || 'templates/search/searchResults/searchResults.dir.html';
                },
                controller: 'SearchResultsCtrl'
            };
        }
    ]);
