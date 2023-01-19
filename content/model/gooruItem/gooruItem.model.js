/* DO NOT DELETE: This file is kept to test the flexibility of the new
external provider integration. E2E's are dependent on this model */
angular.module('Realize.content.model.gooruItem', [
    'Realize.paths',
    'Realize.common.keyStore'
])
    .factory('GooruItem', [
        '$log',
        '$http',
        '$q',
        'PATH',
        'KeyStore',
        function($log, $http, $q, PATH, KeyStore) {
            'use strict';

            function GooruItem(json) {
                angular.extend(this, json);
                this.$setMediaType();
                this.$getThumbnailUrl();
                this.text = this.description;
                this.tags = undefined;
                this.id = this.gooruOid;
                this.version = 1;
                this.attachments = [true];
                this.fileType = 'GOORU';
            }

            var service = GooruItem,
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
                var type = 'Link';

                if (this.category) {
                    type = this.category;
                } else if (this.mediaType && this.mediaType.length) {
                    type = this.mediaType[0];
                }

                switch (type.toLowerCase()) {
                    case 'slide':
                        type = 'Document';
                        break;
                    case 'textbook':
                        type = 'eText';
                        break;
                    case 'exam':
                    case 'handout':
                    case 'interactive':
                    case 'challenge':
                        type = 'Activity';
                        break;
                    case 'website':
                        type = 'Link';
                        break;
                    default:
                        type = 'Activity';
                }

                this.mediaType = type;
            };

            service.prototype.$getThumbnailUrl = function() {
                if (this.thumbnails) {
                    this.thumbnailLocation = this.thumbnails.url;
                    this.thumbnailUrls = [this.thumbnails.url];
                } else {
                    var assetImage = [this.assetURI, this.folder, this.gooruOid].join('');
                    this.thumbnailLocation = assetImage;
                    this.thumbnailUrls = [assetImage];
                }
                return this.thumbnailUrls[0];
            };

            service.prototype.$getSource = function() {
                return this.resourceSource.sourceName || this.resourceSource.domainName;
            };

            service.prototype.$getTitle = function() {
                return this.title;
            };

            service.prototype.$getPlayerUrl = function() {
                var deferred = $q.defer(), self = this;
                if (self.playerUrl) {
                    deferred.resolve(self.playerUrl);
                } else {
                    $http.get(restPath + '/gooruSearch/previewUrl/' + this.gooruOid).then(function(response) {
                        self.playerUrl = response.data;
                        deferred.resolve(self.playerUrl);
                    });
                }
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

            service.prototype.$isGooruItem = function() {
                return true;
            };

            service.getSearchUrl = function() {
                var deferred = $q.defer();
                if (service.searchUrl) {
                    deferred.resolve(service.searchUrl);
                } else {
                    $http.get(restPath + '/gooruSearch/searchUrl').then(function(response) {
                        var searchUrl = response.data;
                        // TODO Gooru API has been updated. backend needs to serve new API target
                        service.searchUrl = searchUrl.replace('/gooru-search/', '/gooruapi/');
                        deferred.resolve(service.searchUrl);
                    });
                }
                return deferred.promise;
            };

            service.filterData = new KeyStore();

            service.updateMultiValueFacets = function(params) {
                if (params.MEDIA_TYPE) {
                    params.category = params.MEDIA_TYPE[0].toLowerCase();
                    selectedFacets = [{
                            fieldName: 'MEDIA_TYPE',
                            values: [{value: params.MEDIA_TYPE[0], count: null}],
                            noLimit: true
                        }];
                } else {
                    selectedFacets = undefined;
                }
            };

            // TODO server should set this as a browser cookie and refresh when expired
            // client should fetch that cookie before each request
            service.getSessionToken = function(checkCache) {
                // return $cookies.gooruSessionToken
                var deferred = $q.defer();

                if (angular.isUndefined(checkCache)) {
                    checkCache = true;
                }

                if (checkCache && service.liveSessionToken) {
                    deferred.resolve(service.liveSessionToken);
                } else {
                    $http.get(restPath + '/gooruSearch/sessionToken').then(function(response) {
                        service.liveSessionToken = response.data.token;
                        deferred.resolve(service.liveSessionToken);
                    }, function(err) {
                        $log.error('Fail to retrieve session token', err);
                        deferred.resolve(''); //Don't set liveSessionToken so it can try again
                    });
                }
                return deferred.promise;
            };

            var convertQueryParams = function(params) {
                var gooruParams = {
                    query: null,
                    queryType: 'single',
                    category: null,
                    pageNum: 1,
                    pageSize: 10,
                    sessionToken: null,
                    excludeAttributes: false,
                    format: 'json',
                    callback: 'JSON_CALLBACK'
                };

                if (params.keywords) { gooruParams.query = params.keywords; }
                if (params.page) { gooruParams.pageNum = params.page; }
                if (params.contentId) { gooruParams.query = params.contentId; }

                angular.forEach(gooruParams, function(p, key) {
                    if (angular.isDefined(params[key])) { gooruParams[key] = params[key]; }
                });

                return gooruParams;
            };

            service.getFacets = function() {
                return [{
                    fieldName: 'MEDIA_TYPE',
                    values: [
                        {value: 'Exam', count: null},
                        {value: 'Handout', count: null},
                        {value: 'Interactive', count: null},
                        {value: 'Lesson', count: null},
                        {value: 'Slide', count: null},
                        {value: 'Textbook', count: null},
                        {value: 'Video', count: null},
                        {value: 'Website', count: null}
                    ],
                    noLimit: true
                }];
            };

            service.cache = {};

            service.convertSearchResult = function(response) {
                response.facets = selectedFacets || service.getFacets();
                response.totalMatches = response.totalHitCount;
                response.results = (response.searchResults || []).map(function(result) {
                    service.cache[result.id] = new GooruItem(result);
                    return service.cache[result.id];
                });

                delete response.executionTime;
                delete response.searchInfo;
                delete response.searchResults;
                delete response.searchType;
                delete response.totalHitCount;
                delete response.userInput;
            };

            service.query = function(params) {
                params = convertQueryParams(params);
                var deferred = $q.defer();

                service.getSearchUrl().then(function(searchUrl) {
                    service.getSessionToken()
                    .then(function(token) {
                        params.sessionToken = token;

                        $http.jsonp(searchUrl, { params: params })
                        .success(function(data) {
                            service.convertSearchResult(data);
                            deferred.resolve(data);
                        })
                        .error(function(data, status) {
                            $log.error('Gooru Search failed', data, status);
                            deferred.reject(data);
                        });
                    });
                });

                return deferred.promise;
            };

            var getGooruItem = function(searchUrl, params, deferred) {
                var item;
                var gooruItemNotFound = function() {
                    if (service.cache[params.query]) {
                        item = service.cache[params.query];
                        delete item.attachments;
                        item.itemNotFound = true;
                        deferred.resolve(item);
                    } else {
                        deferred.resolve({
                            $getTitle: function() { return 'Gooru'; },
                            itemNotFound: true
                        });
                    }
                };

                $http.jsonp(searchUrl, { params: params })
                .success(function(data) {
                    if (!data.resource) {
                        // Note: oddity, we can get items from Gooru search that
                        // don't produce results, so trigger error message instead
                        // of rejecting the deferred
                        gooruItemNotFound();
                    } else {
                        item = new GooruItem(data.resource);
                        item.$getPlayerUrl().then(function() {
                            deferred.resolve(item);
                        });
                    }
                })
                .error(function(data, status) {
                    $log.error('Get Gooru item failed', data, status);
                    gooruItemNotFound();
                });
            };

            // @param {Object} params .see convertQueryParams
            service.get = function(params) {
                var useCachedGooruSession,
                    deferred = $q.defer();

                if (angular.isDefined(params.useCachedGooruSession)) {
                    useCachedGooruSession = !!params.useCachedGooruSession;
                }

                params = convertQueryParams(params);

                service.getSearchUrl().then(function(searchUrl) {
                    // TODO Gooru API has been updated. backend needs to serve new API target
                    searchUrl = searchUrl.replace('/search/resource', '/v2/resource/');
                    searchUrl += params.query;

                    service.getSessionToken(useCachedGooruSession).
                        then(function(token) {
                            var requestParams = {sessionToken: token, callback: params.callback};
                            getGooruItem(searchUrl, requestParams, deferred);
                        });
                });

                return deferred.promise;
            };

            service.getPromise = function(gooruId) {
                var promise = service.get({contentId: gooruId});
                return promise.then(function(response) {
                    return response;
                });
            };

            /**
             * Iterates over a list, populating any Gooru items. If no Gooru items found
             * list is returned unchanged.
             * TODO - consider a server side fix so that we don't have to duplicate fixes in UI (e.g. OLE, Realize)
             *
             * @param {Array} itemsList the list that possibly contains gooru items
             * @param {Function(item)} [iterator] determines if the item is gooru
             * @param {Function(item)} [gooruId] determines the gooru ID for the item
             * @param {Function(list, gResponse)} [onResponse] executes for each response when it is retrieved
             */
            service.retrieveItemsInList = function(itemsList, iterator, gooruId, onResponse) {
                if (angular.isUndefined(iterator)) {
                    iterator = function(item) { return item.fileType === 'GOORU'; };
                }

                if (angular.isUndefined(gooruId)) {
                    gooruId = function(item) { return item.externalId; };
                }

                if (angular.isUndefined(onResponse)) {
                    onResponse = function(list, gResponse) {
                        var gooruItem = _.findWhere(list, {externalId: gResponse.gooruOid});
                        gooruItem.originalEquellaItemId = gooruItem.id;
                        _.extend(gooruItem, new GooruItem(gResponse));
                    };
                }

                var deferred = $q.defer(),
                    gooruItems = _.filter(itemsList, iterator),
                    promises = [];

                if (!gooruItems.length) {
                    deferred.resolve(itemsList);
                } else {
                    angular.forEach(gooruItems, function(item) {
                        promises.push(service.get({contentId: gooruId(item), useCachedGooruSession: true}));
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
