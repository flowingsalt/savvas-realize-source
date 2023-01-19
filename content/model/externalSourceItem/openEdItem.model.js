angular.module('Realize.content.model.openEdItem', [
    'Realize.paths',
    'Realize.common.keyStore',
    'Realize.assignment.constants',
    'rlzComponents.components.resource.search.service'
])
    .factory('OpenEdItem', [
        '$log',
        '$http',
        '$q',
        'PATH',
        'KeyStore',
        'ASSIGNMENT_CONSTANTS',
        'resourceSearchService',
        'resourceSearchServiceUtils',
        function($log, $http, $q, PATH, KeyStore, ASSIGNMENT_CONSTANTS, resourceSearchService,
            resourceSearchServiceUtils) {
            'use strict';

            var fileType = ASSIGNMENT_CONSTANTS.FILE_TYPE.OPENED,
                OPENED = 'openEd',
                facetValues = [
                    {
                        'value': 'media/video',
                        'count': null,
                        'displayName': 'Video'
                    },
                    {
                        'value': 'game',
                        'count': null,
                        'displayName': 'Game'
                    },
                    {
                        'value': 'assessment/item',
                        'count': null,
                        'displayName': 'Assessment/Worksheet'
                    },
                    {
                        'value': 'collection/lesson',
                        'count': null,
                        'displayName': 'Lesson Plan'
                    },
                    {
                        'value': 'assessment/preparation',
                        'count': null,
                        'displayName': 'Homework'
                    },
                    {
                        'value': 'media/audio',
                        'count': null,
                        'displayName': 'Audio'
                    },
                    {
                        'value': 'interactive/simulation',
                        'count': null,
                        'displayName': 'Interactive'
                    },
                    {
                        'value': 'other',
                        'count': null,
                        'displayName': 'Other'
                    }
                ];

            function findFacetDisplayNameByValue(value) {
                var facet = _.find(facetValues, function(facet) {
                    return facet.value === value;
                });

                return facet.displayName;
            }

            function convertToHttpsUrl(externalSrcUrl) {
                return externalSrcUrl.indexOf('https') === -1 ?
                    externalSrcUrl.replace(/^http:\/\//i, 'https://') : externalSrcUrl;
            }

            function OpenEdItem(json) {
                /*Converting openEd id to string because there are checks made based on type for
                Pearson and OpenEd id's which are in string*/
                json.id = String(json.id);
                angular.extend(this, json);
                this.$setMediaType();
                this.$getThumbnailUrl();
                this.text = this.description;
                this.tags = undefined;
                this.externalItemId = this.id;
                this.title = this.name;
                this.version = 1;
                this.contribSource = ASSIGNMENT_CONSTANTS.EXTERNAL_SOURCE.OPENED;
                this.externalSource = ASSIGNMENT_CONSTANTS.EXTERNAL_SOURCE.OPENED;
                this.attachments = [true];
                this.fileType = fileType;
            }

            var service = OpenEdItem,
                restPath = PATH.REST,
                selectedFacets;

            service.prototype.$hasCustomizedTest = angular.noop;
            service.prototype.$isCustomizedTest = angular.noop;

            service.prototype.$hasCustomizedLesson = angular.noop;

            service.prototype.$isLesson = angular.noop;

            service.prototype.$hasRemediation = angular.noop;

            service.prototype.$isTest = angular.noop;

            service.prototype.isDiscussionPrompt = angular.noop;

            service.prototype.isTier = angular.noop;

            service.prototype.isPlaylist = angular.noop;

            service.prototype.$hasInfo = function() {
                return $.trim(this.description).length > 0;
            };

            service.prototype.$setMediaType = function() {
                var type = 'Other';

                if (this.resource_type) {
                    type = this.resource_type;
                }

                switch (type.toLowerCase()) {
                    case 'video':
                    case 'audio':
                    case 'game':
                        type = 'Document';
                        break;
                    case 'assessment':
                    case 'question':
                    case 'lesson_plan':
                    case 'homework':
                        type = 'Activity';
                        break;
                    default:
                        type = 'Activity';
                }

                this.mediaType = type;
            };

            service.prototype.$getThumbnailUrl = function() {
                var thumbnailUrl = '';
                if (this.thumbnailUrl) {
                    thumbnailUrl = this.thumbnailUrl;
                }
                this.thumbnailLocation = thumbnailUrl;
                this.thumbnailUrls = [thumbnailUrl];
                return this.thumbnailUrls[0];
            };

            service.prototype.getExternalResourceDefaultImage = function() {
                return '/mosaic_by_act_default_thumbnail.png';
            };

            service.prototype.$getSource = function() {
                return this.publisher;
            };

            service.prototype.$getTitle = function() {
                return this.name;
            };

            service.prototype.$getPlayerUrl = function() {
                var deferred = $q.defer(),
                    self = this;
                self.url = convertToHttpsUrl(self.student_url);
                deferred.resolve(self.url);
                return deferred.promise;
            };

            service.prototype.$getDefaultVersion = function() {
                return this;
            };

            service.getDefaultItemVersion = function(item) {
                return item;
            };

            service.prototype.$getEquellaItemId = function() {
                return this.originalEquellaItemId || this.id; //fallback to id
            };

            service.prototype.isOpenEdItem = function() {
                return true;
            };

            service.getSearchUrl = function() {
                var deferred = $q.defer();
                if (service.searchUrl) {
                    deferred.resolve(service.searchUrl);
                } else {
                    $http.get(restPath + '/opened/searchUrl').then(function(response) {
                        var searchUrl = response.data;
                        service.searchUrl = searchUrl;
                        deferred.resolve(service.searchUrl);
                    });
                }
                return deferred.promise;
            };

            service.filterData = new KeyStore();

            service.updateMultiValueFacets = function(params) {
                if (params.MEDIA_TYPE) {
                    var selectedFacetValue = params.MEDIA_TYPE[0].toLowerCase();
                    params.resource_type = selectedFacetValue;
                    selectedFacets = [{
                        fieldName: 'MEDIA_TYPE',
                        values: [{
                            value: selectedFacetValue,
                            count: null,
                            displayName: findFacetDisplayNameByValue(selectedFacetValue)}
                        ],
                        noLimit: true
                    }];
                } else {
                    selectedFacets = undefined;
                }
            };

            // TODO server should set this as a browser cookie and refresh when expired
            // client should fetch that cookie before each request
            service.getSessionToken = function(checkCache) {
                // return $cookies.openEdSessionToken
                var deferred = $q.defer();

                if (angular.isUndefined(checkCache)) {
                    checkCache = true;
                }

                if (checkCache && service.liveSessionToken) {
                    deferred.resolve(service.liveSessionToken);
                } else {
                    $http.get(restPath + '/opened/token').then(function(response) {
                        var tokenDetails = response.data;
                        service.liveSessionToken = tokenDetails.access_token;
                        deferred.resolve(service.liveSessionToken);
                    }, function(err) {
                        $log.error('Fail to retrieve session token', err);
                        deferred.resolve(''); //Don't set liveSessionToken so it can try again
                    });
                }
                return deferred.promise;
            };

            var convertQueryParams = function(params) {
                var limit = 10,
                    searchParams = {
                        'resource_type': null,
                        limit: limit,
                        offset: 0
                    };

                if (params.keywords) {
                    searchParams.descriptive = params.keywords;
                }
                if (params.page) {
                    searchParams.offset = (params.page - 1) * limit;
                }
                if (params.contentId) {
                    searchParams.query = params.contentId;
                }

                angular.forEach(searchParams, function(p, key) {
                    if (angular.isDefined(params[key])) {
                        searchParams[key] = params[key];
                    }
                });

                return searchParams;
            };

            var buildRssQueryParams = function(params) {
                params.repository = OPENED;
                if (params.resource_type) {
                    params.learningResourceType = params.resource_type;
                }
                return params;
            };

            service.getFacets = function() {
                return [{
                    fieldName: 'MEDIA_TYPE',
                    // make a copy of facets array so that any mods done to the facet in search result directive
                    // would be reset. e.g. clear the isLoading flag set when the facet is clicked
                    values: angular.copy(facetValues),
                    noLimit: false
                }];
            };

            service.cache = {};

            service.convertSearchResult = function(response) {
                var totalMatches,
                    maxResourceLimit = 1000;
                response.facets = selectedFacets || service.getFacets();
                totalMatches = response.meta.pagination.total_entries;
                response.totalMatches = Math.min(totalMatches, maxResourceLimit);

                response.results = (response.resources || []).map(function(result) {
                    service.cache[result.id] = new OpenEdItem(result);
                    return service.cache[result.id];
                });

                delete response.resources;
                delete response.meta;
                delete response.standards;
            };

            service.convertRsstoSearchResult = function(response) {
                var totalMatches,
                    maxResourceLimit = 1000;
                response.facets = selectedFacets || service.getFacets();
                totalMatches = response.totalResources;
                response.totalMatches = Math.min(totalMatches, maxResourceLimit);

                response.results = (response.resources || []).map(function(result) {
                    service.cache[result.id] = new OpenEdItem(result);
                    return service.cache[result.id];
                });

                delete response.resources;
                delete response.totalResources;
            };

            service.query = function(params) {
                var deferred = $q.defer();
                params = buildRssQueryParams(params);
                resourceSearchService.getSearchResults(resourceSearchServiceUtils.buildSearchQueryParams(params))
                    .then(function(response) {
                        if (response && response.resources) {
                            service.convertRsstoSearchResult(response);
                            deferred.resolve(response);
                        } else {
                            deferred.reject(response);
                        }
                    });
                return deferred.promise;
            };

            var getOpenEdItem = function(params, deferred) {
                var item;
                if (service.cache[params.query]) {
                    item = service.cache[params.query];
                    item.itemNotFound = true;
                    deferred.resolve(item);
                } else {
                    if (params.query) {
                        params.id = params.query;
                    }
                    params.repository = OPENED;
                    resourceSearchService.getSearchResults(resourceSearchServiceUtils.buildSearchQueryParams(params))
                        .then(function(response) {
                            if (response && response.resources) {
                                deferred.resolve(new OpenEdItem(response.resources[0]));
                            } else {
                                deferred.reject(response);
                            }
                        });
                }
            };

            // @param {Object} params .see convertQueryParams
            service.get = function(params) {
                var deferred = $q.defer();
                params = convertQueryParams(params);
                getOpenEdItem(params, deferred);
                return deferred.promise;
            };

            service.getPromise = function(openEdItemId) {
                var promise = service.get({contentId: openEdItemId});
                return promise.then(function(response) {
                    return response;
                });
            };

            service.prototype.isExternalResource = function() {
                return true;
            };

            /**
             * Iterates over a list, populating any OpenEd items. If no OpenEd items are found
             * list is returned unchanged.
             * TODO - consider a server side fix so that we don't have to duplicate fixes in UI (e.g. OLE, Realize)
             *
             * @param {Array} itemsList the list that possibly contains openEd items
             * @param {Function(item)} [iterator] determines if the item is OpenEd
             * @param {Function(item)} [openEdItemId] determines the OpenEd ID for the item
             * @param {Function(list, response)} [onResponse] executes for each response when it is retrieved
             */
            service.retrieveItemsInList = function(itemsList, iterator, openEdItemId, onResponse) {
                if (angular.isUndefined(iterator)) {
                    iterator = function(item) {
                        return item.fileType === fileType;
                    };
                }

                if (angular.isUndefined(openEdItemId)) {
                    openEdItemId = function(item) {
                        return item.externalId;
                    };
                }

                if (angular.isUndefined(onResponse)) {
                    onResponse = function(list, response) {
                        var openEdItem = _.findWhere(list, {externalId: response.id});
                        openEdItem.originalEquellaItemId = openEdItem.id;
                        _.extend(openEdItem, new OpenEdItem(response));
                    };
                }

                var deferred = $q.defer(),
                    openEdItems = _.filter(itemsList, iterator),
                    promises = [];

                if (!openEdItems.length) {
                    deferred.resolve(itemsList);
                } else {
                    angular.forEach(openEdItems, function(item) {
                        promises.push(service.get({contentId: openEdItemId(item)}));
                    });
                    $q.all(promises).then(function(responses) {
                        angular.forEach(responses, function(response) {
                            onResponse(itemsList, response);
                        });
                        deferred.resolve(itemsList);
                    });
                }
                return deferred.promise;
            };

            return service;
        }
    ]);
