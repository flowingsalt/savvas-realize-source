angular.module('RealizeDirectives')
    .directive('facinator', [
        '$filter',
        'Messages',
        'rubricEventTracking',
        'lwcI18nFilter',
        'playlistTelemetryService',
        'playlistUtilService',
        'PLAYLIST_CONSTANTS',
        'searchTelemetryUtilitiesService',
        'TELEMETRY_FACETS_CONSTANTS',
        'LeveledReadersSvc',
        function($filter, Messages, rubricEventTracking, lwcI18nFilter, playlistTelemetryService, playlistUtilService,
            PLAYLIST_CONSTANTS, searchTelemetryUtilitiesService, TELEMETRY_FACETS_CONSTANTS, LeveledReadersSvc) {
            'use strict';

            return {
                scope: {
                    facets: '=facinator',
                    selected: '=',
                    singleSelect: '=?'
                },
                templateUrl: 'templates/search/facinator/facinator.dir.html',
                controller: ['$scope', function($scope) {
                    $scope.more = {};
                    $scope.limit = {};
                    $scope.selectOrder = 0;

                    $scope.getMessage = Messages.getMessage;

                    // use rootScope so we learn of location change first to notify parent scopes
                    $scope.$root.$on('$locationChangeStart', function() {
                        $scope.$emit('facinator.exiting', {selectOrder: $scope.selectOrder});
                    });

                    $scope.$on('facinator.selectOrder.changed', function(ev, order) {
                        $scope.selectOrder = order;
                    });

                    $scope.$on('searchResults.facet.filter.toggled', function(e, selectedThumbnail) {
                        $scope.toggle('FEATURED_RESOURCES', selectedThumbnail);
                    });

                    $scope.$watch('facets', function(facets) {
                        if (!facets) {return;}

                        angular.forEach(facets, function(facet) {
                            if (angular.isUndefined($scope.limit[facet.fieldName])) {
                                $scope.limit[facet.fieldName] = (facet.noLimit) ? 1000 : 6;
                            }
                            if ($scope.limit[facet.fieldName] > 6) {
                                $scope.limit[facet.fieldName] = 6;
                                $scope.more[facet.fieldName] = false;
                            }
                            angular.forEach(facet.values, function(facetValues) {
                                facetValues.ariaLabel = facetValues.displayName + ' ' +
                                    lwcI18nFilter('keywordSearch.facetSelection.with') + ' ' +
                                    facetValues.count + ' ' + lwcI18nFilter('keywordSearch.facetSelection.items');
                            });
                        });
                    });

                    $scope.hasSelectedTags = function(facetName) {
                        if (angular.isDefined($scope.selected[facetName])) {
                            return $scope.selected[facetName].length > 0;
                        }
                        return false;
                    };

                    $scope.clearSelectedTags = function(facetName) {
                        $scope.selected[facetName] = [];
                    };

                    $scope.isTagSelected = function(facetName, tagValue) {
                        var isSelected = false;

                        angular.forEach($scope.selected[facetName], function(tag) {
                            if (tagValue === tag.value) {
                                isSelected = true;
                            }
                        });

                        return isSelected;
                    };

                    $scope.facetHasTag = function(facet, tagValue) {
                        var hasTag = false;

                        angular.forEach($scope.selected[facet], function(tag) {
                            if (tagValue === tag.value) {
                                hasTag = true;
                            }
                        });

                        return hasTag;
                    };

                    $scope.isNotBrowsePage = function() {
                        var isResourceListPage = playlistUtilService.isResourceListPage();
                        var isBrowseAllPage = playlistUtilService.isBrowseAllPage();
                        var isResourcePage = playlistUtilService.isResourcePage();
                        var isStandardPage = playlistUtilService.isStandardPage();
                        return !isResourceListPage && !isBrowseAllPage && !isResourcePage &&
                            !isStandardPage;
                    };

                    $scope.toggle = function(facet, value) {
                        var originConfig = playlistUtilService.getOriginPageInfo();
                        var isResourcePage = playlistUtilService.isResourcePage();
                        var isStandardPage = playlistUtilService.isStandardPage();
                        var isSearchPage = playlistUtilService.isSearchPage();
                        var isSelected = false;
                        if (angular.isUndefined($scope.selectOrder)) {
                            $scope.selectOrder = 0;
                        } else {
                            $scope.selectOrder += 1;
                        }
                        value.selectOrder = $scope.selectOrder;

                        if (angular.isUndefined($scope.selected)) {
                            $scope.selected = {};
                        }

                        if (angular.isUndefined($scope.selected[facet])) {
                            $scope.selected[facet] = [value];
                            isSelected = true;
                        } else {
                            if ($scope.facetHasTag(facet, value.value)) {
                                $scope.selected[facet] = $filter('filter')($scope.selected[facet], function(tag) {
                                        return value.value !== tag.value;
                                    });
                            } else {
                                $scope.selected[facet].push(value);
                                isSelected = true;
                            }
                        }

                        if (facet === 'RUBRIC' && isSelected && $scope.isNotBrowsePage() &&
                                originConfig.originArea !== TELEMETRY_FACETS_CONSTANTS.PAGE.SEARCH) {
                            rubricEventTracking.clickOnRubricFacetSearch(value.value, value.count);
                        }
                        if (value.facet === 'MEDIA_TYPE' && isSelected && $scope.isNotBrowsePage()) {
                            if (originConfig.originPage !== PLAYLIST_CONSTANTS.TELEMETRY.PAGE.BROWSE_ALL &&
                                    originConfig.originArea !== TELEMETRY_FACETS_CONSTANTS.PAGE.SEARCH) {
                                playlistTelemetryService.onFacetSelected(value.value, value.count,
                                    originConfig.originArea);
                            }
                        }

                        if (isResourcePage && isSelected) {
                            var resourcesPage = TELEMETRY_FACETS_CONSTANTS.PAGE.RESOURCES;
                            var resourceBrowseArea = TELEMETRY_FACETS_CONSTANTS.PAGE.BROWSE;
                            var resourcesFieldName = $filter('facetField')(facet);
                            searchTelemetryUtilitiesService.sendTelemetryEventForBrowse(
                                resourcesPage, value.displayName, resourcesFieldName, value.count,
                                resourceBrowseArea);
                        } else if (isStandardPage && isSelected) {
                            var standardsPage = TELEMETRY_FACETS_CONSTANTS.PAGE.STANDARDS;
                            var standardsBrowseArea = TELEMETRY_FACETS_CONSTANTS.PAGE.BROWSE;
                            var standardsCategoryName = $filter('facetField')(facet);
                            searchTelemetryUtilitiesService.sendTelemetryEventForBrowse(
                                standardsPage, value.displayName, standardsCategoryName, value.count,
                                standardsBrowseArea);
                        } else if (originConfig.originArea === TELEMETRY_FACETS_CONSTANTS.PAGE.SEARCH &&
                                isSearchPage && isSelected) {
                            var searchResultPage = TELEMETRY_FACETS_CONSTANTS.PAGE.SEARCH_RESULTS;
                            var searchArea = TELEMETRY_FACETS_CONSTANTS.PAGE.SEARCH;
                            var searchCategoryName = $filter('facetField')(facet);
                            searchTelemetryUtilitiesService.sendTelemetryEventForBrowse(
                                searchResultPage, value.displayName, searchCategoryName, value.count, searchArea);
                        } else if (originConfig.originSubpage === TELEMETRY_FACETS_CONSTANTS.SCALE.DRA &&
                            isSelected) {
                            var draSearchCategoryName = $filter('facetField')(facet);
                            var startValue = LeveledReadersSvc.getScaleStartFromRoute();
                            var endValue = LeveledReadersSvc.getScaleEndFromRoute();
                            var productTitle = LeveledReadersSvc.getProgramTitle();
                            searchTelemetryUtilitiesService.sendTelemetryEventForDra(value.displayName,
                                draSearchCategoryName, value.count, productTitle, startValue, endValue);
                        }

                        $scope.more[facet] = false;
                    };
                }]
            };
        }
    ])

    .filter('facetField',
        function() {
            'use strict';

            return function(input) {
                var i, len;

                if (!angular.isDefined(input)) {return;}

                var parts = input.split(/_/g),
                    temp = '';

                for (i = 0, len = parts.length; i < len; i++) {
                    temp = parts[i].toLowerCase();
                    parts[i] = temp[0].toUpperCase() + temp.substr(1);
                }

                parts = parts.join(' ');

                var facetDisplayName = {
                    'Distance Learning': 'Recommended for Distance Learning',
                    'Content Type': 'Content Category',
                    'Library Title': 'Program',
                    'Custom Facet Library': 'Library',
                    'Custom Facet Themes': 'Theme',
                    'Custom Facet Skills Teaching Opportunities':  'Skills Teaching Opportunities',
                    'Custom Facet Cross Curricular Connections': 'Cross Curricular Connections'
                };
                return facetDisplayName[parts] ? facetDisplayName[parts] : parts;
            };
        }
    )

    .directive('selectedFacetList', [
        '$compile',
        'Messages',
        function($compile, Messages) {
            'use strict';

            return {
                scope: {
                    facets: '=selectedFacetList',
                    hasTagsSelected: '='
                },

                template: [
                    '<ul class="value-list inline">',
                        '<li class="clear-all">',
                            '<a ng-click="clearAll();" data-e2e-id="clear" href="javascript://">',
                                '{{ "keywordSearch.action.clearAll" | lwcI18n }}',
                            '</a>',
                        '</li>',
                        '<li ng-repeat="tag in tagPool | orderBy:\'selectOrder\'"',
                            ' ng-click="clearTag(tag.value, tag.facet)" class="value selected">',
                            '<a ng-show="tag.count !== null" href="javascript://" data-e2e-id="{{!!tag.count}}toggle">',
                                '{{ tag.displayName }}',
                                '<span ng-if="tag.facet !=\'DISTANCE_LEARNING\'">({{ tag.count }})</span>',
                                '<i class="icon-remove"></i>',
                                '<span class="a11yOffScreen">',
                                    '{{ "keywordSearch.facetSelection.removeFilter" | lwcI18n }}',
                                '</span>',
                            '</a>',
                            '<a ng-show="tag.count === null" href="javascript://" data-e2e-id="{{!tag.count}}toggle">',
                                '{{ tag.displayName }}<i class="icon-remove"></i>',
                            '</a>',
                        '</li>',
                    '</ul>'
                ].join(''),

                controller: ['$scope', '$filter', function($scope, $filter) {
                    $scope.clearTag = function(tagValue, facet) {
                        $scope.facets[facet] = $filter('filter')($scope.facets[facet], function(tag) {
                                return tagValue !== tag.value;
                            });
                    };

                    $scope.clearAll = function() {
                        $scope.$emit('selectedFacetList.clearAll');
                    };
                }],

                link: function(scope) {
                    scope.getMessage = Messages.getMessage;
                    scope.$watch('facets', function() {
                        scope.hasTagsSelected = false;
                        scope.tagPool = [];

                        angular.forEach(scope.facets, function(facet) {
                            scope.hasTagsSelected = true; // at least one selection
                            scope.tagPool = scope.tagPool.concat(facet);
                        });

                        if (scope.tagPool.length === 0) {
                            scope.hasTagsSelected = false;
                        }
                    }, true);
                }
            };
        }
    ]);
