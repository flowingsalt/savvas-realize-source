angular.module('Realize.content.model.contentItem', [
        'Realize.content.constants',
        'Realize.common.browserInfoService',
        'Realize.common.mediaQueryService',
        'Realize.common.helpers',
        'Realize.common.keyStore',
        'Realize.standards.standardDataService',
        'Realize.paths',
        'Realize.constants.mediaType',
        'Realize.content.model.gooruItem',
        'Realize.content.model.openEdItem',
        'Realize.constants.contribSource',
        'Realize.user.currentUser',
        'Realize.constants.contentUploadTypes'
    ])
    .factory('Content', [
        '$http',
        '$log',
        '$rootScope',
        '$q',
        'PATH',
        '$filter',
        'KeyStore',
        'CONTENT_CONSTANTS',
        'OpenEdItem',
        'Standard',
        'RealizeHelpers',
        '$cacheFactory',
        'BrowserInfo',
        'MediaQuery',
        'MEDIA_TYPE',
        'CONTRIBUTOR_SOURCE',
        '$location',
        'User',
        '$currentUser',
        'locationUtilService',
        function($http, $log, $rootScope, $q, PATH, $filter, KeyStore, CONTENT_CONSTANTS, OpenEdItem,
            Standard, helpers, $cacheFactory, BrowserInfo, MediaQuery, MEDIA_TYPE, CONTRIBUTOR_SOURCE, $location,
            User, $currentUser, locationUtilService) {
            'use strict';

            function setStandardLocaleDesc(item) {
                angular.forEach(item.standards, function(standard) {
                    Standard.localeDescription(standard, item.language);
                });
                if (item.contentItems) {
                    angular.forEach(item.contentItems, function(contentItem) {
                        setStandardLocaleDesc(contentItem);
                    });
                }
            }

            var processStandardDescription = function(response) {
                angular.forEach(response.results, function(item) {
                    setStandardLocaleDesc(item);
                });
            };

            function Content(json) {
                var self = this;

                angular.extend(self, json || {});
                // objectify children
                self.contentItems = (self.contentItems || []).map(function(item) {
                    return new Content(item);
                });

                angular.forEach(self.contentItems, function(item) {
                    setStandardLocaleDesc(item);
                });

                // objectify any tools
                if (self.associatedTools && self.associatedTools.contentItems) {
                    self.associatedTools.contentItems = self.associatedTools.contentItems.map(function(item) {
                        return new Content(item);
                    });
                }

                // objectify teacher support
                if (self.associatedTeacherSupport && self.associatedTeacherSupport.contentItems) {
                    self.associatedTeacherSupport.contentItems = self.associatedTeacherSupport.contentItems
                        .map(function(item) {
                            return new Content(item);
                        });
                }

                // filling in dummy value for item metrics if its absent. Similiar to OpenEd Item.
                if (!self.metrics) {
                    self.metrics = {
                        'uuid': null,
                        'version': 1,
                        'visitCount': 0,
                        'commentCount': 0
                    };
                }

                // resolve from details
                self.$buildFromDetailsTree();
            }

            var skillsLocaleDescription = function(skill) {
                if (($rootScope.currentProgram.language === 'Spanish' ||
                        $rootScope.currentUser.getAttribute('profile.locale') === 'es') &&
                    (skill.spanishDescription !== '' && skill.spanishDescription !== null)) {
                    skill.description = skill.spanishDescription;
                }
            };

            var setSkillsLocaleDescription = function(response) {
                var results = [];
                angular.forEach(response.data.questions, function(question) {
                    angular.forEach(question.skillDetails, function(skill) {
                        skillsLocaleDescription(skill);
                    });
                    results.push(question);
                });
                return angular.extend({}, response.data, {
                    results: results
                });
            };

            var convertQueryResults = function(response) {
                $log.log('content query success handler', arguments);
                var results = [];

                angular.forEach(response.data.results, function(item) {
                    results.push(new Content(item));
                });

                return OpenEdItem.retrieveItemsInList(results, function(item) {
                        return item.externalSource === 'OpenEd';
                    })
                    .then(function(allResults) {
                        // $http success chains the same promise, we need to instead pass along a modified version
                        var next = angular.copy(response.data);
                        next.results = allResults;
                        return next;
                    });
            };

            var updateQueryResultsTeacherOnly = function(response) {
                var ids = $.Enumerable.From(response.results)
                    .Where('$.mediaType == "Lesson" && $.teacherOnly == "UNKNOWN"')
                    .Select('$.id').ToArray(),
                    promise;

                if (ids.length > 0) {
                    // get teacher only in batch
                    promise = Content.getTeacherOnlyValues(ids)
                        .then(function(teacherOnlyResponse) {
                            var key, i, len;
                            for (key in teacherOnlyResponse.data) {
                                if (teacherOnlyResponse.data.hasOwnProperty(key)) {
                                    for (i = 0, len = response.results.length; i < len; i++) {
                                        //$log.log('lookin', key, 'dost =', response.results[i].id);
                                        if (response.results[i].id === key) {
                                            response.results[i].teacherOnly = teacherOnlyResponse.data[key] ?
                                                'Yes' : 'No';
                                            //$log.log('found TO id', response.results[i].teacherOnly);
                                            break; // only should have one
                                        }
                                    }
                                }
                            }

                            var next = angular.copy(response);
                            //$log.log('content TO next', next);
                            // chained
                            return next;
                        });

                    return promise;
                } else {
                    $log.log('content.query : no unknowns to test');

                    var next = angular.copy(response);
                    //$log.log('content TO next', next);
                    // chained
                    return next;
                }
            };

            //@param less - when true, call does not return empty or null fields of items.
            Content.query = function(params, less, cache) {
                $log.log('Content.query called', params);

                var restUrl = PATH.REST + (less ? '/items' : '/content');
                var promise = $http.get(restUrl, {
                        params: params,
                        cache: !!cache
                    })
                    .then(function(response) {
                        response.data.results = Content.getListWithCustomizedTestInserted(response.data.results);
                        return response;
                    })
                    .then(convertQueryResults)
                    .then(updateQueryResultsTeacherOnly);
                if (params.STATE_STANDARD) {
                    promise.then(processStandardDescription);
                }
                return promise;
            };

            Content.queryFast = function(params, success, error) {
                var promise = null;
                var future = [];

                promise = $http.get(PATH.REST + '/search_fast', {
                        params: params
                    })
                    .then(function(response) {
                        var results = [];

                        angular.forEach(response.data, function(item) {
                            results.push(new Content(item));
                        });

                        // copy to future to preserve reference
                        future = angular.copy(results);

                        return future;
                    });

                // any user added handlers
                if (angular.isDefined(success) && angular.isFunction(success)) {
                    promise.then(success);
                }

                if (angular.isDefined(error) && angular.isFunction(error)) {
                    promise.then(null, error);
                }

                return future;
            };

            // simplified query for eTexts (see student assignment query)
            Content.getETexts = function(productIdQuery, cache) {
                return $http.get(PATH.REST + '/search_fast', {
                    params: {
                        OLE_PRODUCT_ID: productIdQuery,
                        pageSize: '20',
                        MEDIA_TYPE: 'eText',
                        filterBySubscriptions: true,
                        NOT_ITEM_STATUS: ['deleted', 'archived']
                    },
                    cache: !!cache
                }).then(function(response) {
                    var results = [];
                    _.each(response.data, function(etext) {
                        results.push(new Content(etext));
                    });

                    return results;
                }, function(err) {
                    return $q.reject(err);
                });
            };

            Content.getToolsByPrograms = function(productIds, cache) {

                var promise = $http.get(PATH.REST + '/tools', {
                    params: {
                        programs: productIds
                    },
                    cache: !!cache
                }).then(function(response) {
                    var tools = [];
                    _.each(response.data, function(tool) {
                        tools.push(new Content(tool));
                    });
                    return tools;
                }, function(err) {
                    return $q.reject(err);
                });

                return promise;
            };

            Content.setStudentCenterData = function(params) {
                var promise = null;

                promise = $http.post(PATH.REST + '/studentcenters', params)
                    .then(function(response) {
                        return response.data;
                    });

                return promise;
            };

            // get a single content item
            // @param less - when true, call does not return empty or null fields of item.
            Content.get = function(params, less, cache, skipInsertCustomized) {
                $log.log('Content.get async called', arguments);

                var future = {},
                    promise = null,
                    url = less ? [PATH.REST, 'items', params.contentId, 'versions', params.version].join('/') : [
                        PATH.REST, 'content', params.contentId, params.version
                    ].join('/');

                // clear these out as they are used in url, not needed to send as query params
                delete params.contentId;
                delete params.version;

                // setup default levels param
                if (!angular.isDefined(params.levels)) {
                    params.levels = 1;
                }

                // Sending additional param fetchLatestContent while editing content
                // fetchLatestContent is true means will get latest content from content service
                if (locationUtilService.isEditPage() || locationUtilService.isReorderPage()) {
                    params.fetchLatestContent = true;
                }

                promise = $http.get(url, {
                        params: params,
                        cache: !!cache
                    })
                    .then(function(response) {
                        processStandardDescription(response.data);
                        return response;
                    })
                    .then(function(response) {
                        if (!skipInsertCustomized) {
                            var isCustomizedSequence = response.data.fileType === 'Sequence' &&
                                Content.hasCustomizedItem(response.data);
                            if (isCustomizedSequence) {
                                response.data.customizedItem.contentItems =
                                    Content
                                    .getListWithCustomizedTestInserted(response.data.customizedItem.contentItems);
                            }
                            response.data.contentItems =
                                Content.getListWithCustomizedTestInserted(response.data.contentItems);
                        }
                        return response;
                    }).then(function(response) {
                        // copy to future to preserve reference
                        future = angular.copy(new Content(response.data));

                        if (future.fileType === 'Sequence') {
                            var filterFunction = function(item) {
                                return item.externalSource === 'OpenEd';
                            };
                            return OpenEdItem.retrieveItemsInList(future.contentItems, filterFunction)
                                .then(function() {
                                    return future.$updateTeacherOnly();
                                });
                        } else if (future.externalSource === 'OpenEd') {
                            var originalEquellaItemId = future.id;
                            return OpenEdItem.getPromise(future.externalId).then(function(item) {
                                future = new Content(item);
                                future.id = originalEquellaItemId;
                                return future.$updateTeacherOnly();
                            });
                        }

                        // fwd for promise chaining
                        return future.$updateTeacherOnly();

                    });

                return promise;
            };

            Content.getCustomContent = function(params) {
                var future = {},
                    promise = null,
                    url = [PATH.REST, 'content', 'updateassociateditems'].join('/');

                promise = $http({
                        method: 'POST',
                        url: url,
                        data: JSON.stringify(params),
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    }).then(function(response) {
                        processStandardDescription(response.data);
                        return response;
                    })
                    .then(function(response) {
                        // copy to future to preserve reference
                        future = angular.copy(new Content(response.data));

                        if (future.fileType === 'Sequence') {
                            var filterFunction = function(item) {
                                return item.externalSource === 'OpenEd';
                            };
                            return OpenEdItem.retrieveItemsInList(future.contentItems, filterFunction)
                                .then(function() {
                                    return future.$updateTeacherOnly();
                                });
                        } else if (future.externalSource === 'OpenEd') {
                            var originalEquellaItemId = future.id;
                            return OpenEdItem.getPromise(future.externalId).then(function(item) {
                                future = new Content(item);
                                future.id = originalEquellaItemId;
                                return future.$updateTeacherOnly();
                            });
                        }

                        // fwd for promise chaining
                        return future.$updateTeacherOnly();

                    });
                return promise;
            };

            Content.getWithoutInsertingCustomized = function(params, less, cache) {
                var skipInsertCustomized = true;
                return Content.get(params, less, cache, skipInsertCustomized);
            };

            // get customised versions for single content item
            Content.getCustomisedVersions = function(contentItem, cache) {
                var restUrl = PATH.REST + '/customizeditems/' + contentItem.id;
                var promise = $http.get(restUrl, {
                        cache: !!cache
                    })
                    .then(function(response) {
                        var customisedVersions = [];
                        if (response.data.customizedItems) {
                            angular.forEach(response.data.customizedItems, function(item) {
                                item.isCustomizedVersion = true;
                                item.originalItem = contentItem;
                                item.originalItemId = contentItem.id;
                                customisedVersions.push(new Content(item));
                            });
                        }
                        return customisedVersions;
                    }, function(data) {
                        $log.error('failed to retrieve customisedVersions', data.status, data.statusText);
                    });
                return promise;
            };

            var getJsonKeyForAssociatedItem = function(name) {
                switch (name) {
                    case 'Teacher Support':
                        return 'associatedTeacherSupport';
                    case 'Tools':
                        return 'associatedTools';
                }
            };

            //Non-proto so it could be used on obj that is not instance of Content
            Content.hasCustomizedItem = function(item) {
                if (item.mediaType === MEDIA_TYPE.TEST) {
                    return item.customizedItemDefaultView;
                } else {
                    return item.customizedItem && item.customizedItemDefaultView;
                }
            };

            Content.isHiddenViaCustomize = function(item) {
                return item.associativeProps && item.associativeProps.externalSource ===
                    'Teacher, HideFromStudent';
            };

            Content.isDistanceLearningContent = function(contentItems) {
                var isDistanceLearning = false;
                for (var i = 0; i < contentItems.length; i++) {
                    if (contentItems[i].associativeProps.isDistanceLearning === 'true') {
                        isDistanceLearning = true;
                        break;
                    }
                }
                return isDistanceLearning;
            };

            Content.prototype.$hasAssociatedItem = function(name) {
                var item = this,
                    key = getJsonKeyForAssociatedItem(name);

                return item[key] &&
                    !helpers.isNullOrUndefined(item[key].id) &&
                    !helpers.isNullOrUndefined(item[key].version);
            };

            Content.prototype.$setAssociatedItem = function(name, less, cache) {
                var item = this,
                    key = getJsonKeyForAssociatedItem(name);

                var deferredAssociatedItem = $q.defer();

                if (item.$hasAssociatedItem(name)) {

                    Content.get({
                        contentId: item[key].id,
                        version: item[key].version
                    }, less, cache).then(function(associatedItem) {
                        item[key] = associatedItem;
                        deferredAssociatedItem.resolve();
                    }, function() {
                        $q.reject();
                    });

                } else {
                    deferredAssociatedItem.resolve();
                }

                return deferredAssociatedItem.promise;
            };

            Content.getRoute = function(item, program, tier, lesson) {
                // in this method "tier" may refer to an actual Tier or a Lesson
                // we need all this logic JUST so we can have a little arrow that says back to whatever :)
                if (program && tier && lesson) {
                    // this case there are no nested lessons, so tier must be a tier, and item must be general content
                    // todo: assert?
                    return [
                        '/program', program.id, program.version, 'tier',
                        tier.id, tier.version, 'lesson', lesson.id, lesson.version,
                        'content', item.id, item.version
                    ].join('/');
                } else if (program && tier) {

                    if (item.editAssessment) {
                        // launch assessment builder
                        // e.g. /program/:programId/:programVersion/tier/:tierId/:tierVersion/assessment/
                        //      :itemId/:itemVersion/edit
                        return [
                            '/program', program.id, program.version, tier.mediaType.toLowerCase(),
                            tier.id, tier.version, 'assessment',
                            item.id, item.version, 'edit'
                        ].join('/');
                    }

                    if (item.mediaType === 'Lesson') {
                        return [
                            '/program', program.id, program.version, tier.mediaType.toLowerCase(),
                            tier.id, tier.version, 'lesson', item.id, item.version
                        ].join('/');
                    } else {
                        return [
                            '/program', program.id, program.version, tier.mediaType.toLowerCase(),
                            tier.id, tier.version, 'content', item.id, item.version
                        ].join('/');
                    }
                } else if (program) {
                    if (item.editAssessment) {
                        // launch assessment builder
                        // e.g. /program/:programId/:programVersion/assessment/:itemId/:itemVersion/edit
                        return [
                            '/program', program.id, program.version, 'assessment',
                            item.id, item.version, 'edit'
                        ].join('/');
                    }
                    var tierDelim = item.mediaType === 'Lesson' ||
                        item.mediaType === 'Tier' ? item.mediaType.toLowerCase() : 'content';
                    return [
                        '/program', program.id, program.version, tierDelim, item.id, item.version
                    ].join('/');
                } else if (item.essayPrompt) {
                    return ['/assessment/essay', item.id, item.version, 'edit'].join('/');
                } else {
                    // direct link to an item
                    if (item.mediaType === 'Test') {
                        return ['/assessment', item.id, item.version, 'edit'].join('/');
                    } else if (item.mediaType === 'Tier' && item.root) {
                        return ['/program', item.id, item.version].join('/');
                    } else if (item.mediaType === 'Lesson') {
                        return ['/lesson', item.id, item.version, 'edit'].join('/');
                    } else {
                        return ['/content', item.id, item.version].join('/');
                    }
                }
            };

            Content.publish = function(contentItem, callback) {
                $http({
                        url: PATH.REST + '/jobs/items/published/' + contentItem.id + '/' + contentItem.version,
                        method: 'PUT'
                    })
                    .then(function(response) {
                        var allProgramsUrl = [PATH.REST, 'programs'].join('/'),
                            allCentersUrl = [PATH.REST, 'centers'].join('/'),
                            cache = $cacheFactory.get('$http');

                        cache.remove(allProgramsUrl);
                        cache.remove(allCentersUrl);

                        if (response) {
                            callback();
                        }
                    }, function(error) {
                        console.log(error, 'can not get data.');
                    });
            };

            // get the assessment object
            Content.getAssessment = function(assessmentId, success) {
                assessmentId = assessmentId + '.json';
                var promise = $http({
                        url: [PATH.REST, 'assessment/load', assessmentId].join('/'),
                        method: 'GET'
                    })
                    .error(function(data) {
                        $log.error('failed to retrieve assessment', data.errorCode, data.errorMessage);
                    });
                promise.then(setSkillsLocaleDescription);
                if (success) {
                    promise.success(success);
                }

                return promise;
            };

            Content.getSkillsById = function(ids, success) {
                var promise = $http({
                        url: PATH.REST + '/skills',
                        params: {
                            'ids[]': ids
                        },
                        method: 'GET'
                    })
                    .error(function(data) {
                        $log.error('failed to fetch skill details', data.errorCode, data.errorMessage);
                    });

                if (success) {
                    promise.success(success);
                }

                return promise;
            };

            Content.updateMultiValueFacets = function(params) {
                var facetNames = [
                    'DISTANCE_LEARNING', 'FEATURED_RESOURCES', 'GRADE', 'LEARNING_MODEL', 'LIBRARY_TITLE', 'SUBTOPIC',
                    'COMPREHENSION_SKILLS', 'TEXT_FEATURES', 'GENRES', 'CONTENT_AREAS',
                    'CUSTOM_FACET_LIBRARY', 'CUSTOM_FACET_THEMES',
                    'CUSTOM_FACET_SKILLS_TEACHING_OPPORTUNITIES',
                    'CUSTOM_FACET_CROSS_CURRICULAR_CONNECTIONS'
                ];
                angular.forEach(facetNames, function(name) {
                    if (params[name] && params[name].length !== 0) {
                        var joinedValues = params[name].join(',');
                        //params[name].keywords = joinedValues;
                        //params[name].type = "ALL";

                        // Please remove this when josh fixes back end code to use parameters and not string search.
                        params[name] = 'ALL(' + joinedValues + ')';
                    }
                });
            };

            Content.updateMultiValueFacetsForBrowseAll = function(params) {
                var facetNames = [
                    'DISTANCE_LEARNING', 'FEATURED_RESOURCES', 'GRADE', 'LEARNING_MODEL', 'LIBRARY_TITLE', 'SUBTOPIC',
                    'COMPREHENSION_SKILLS', 'TEXT_FEATURES', 'GENRES', 'CONTENT_AREAS',
                    'CUSTOM_FACET_LIBRARY', 'CUSTOM_FACET_THEMES',
                    'CUSTOM_FACET_SKILLS_TEACHING_OPPORTUNITIES',
                    'CUSTOM_FACET_CROSS_CURRICULAR_CONNECTIONS'
                ];
                angular.forEach(facetNames, function(name) {
                    if (params[name] && params[name].length !== 0) {
                        var joinedValues = params[name].join(',');
                        if (name === 'LIBRARY_TITLE') {
                            params[name] = 'ANY(' + joinedValues + ')';
                        } else {
                            params[name] = 'ALL(' + joinedValues + ')';
                        }
                    }
                });
            };

            Content.getLessonTOCRoute = function(programId, programVersion, UUID) {
                return [
                    '/program', programId, programVersion, 'tier', UUID, '0'
                ].join('/');
            };

            // get teacher only values from server for array of item ids
            Content.getTeacherOnlyValues = function(itemUuids, success) {
                $log.log('getTeacherOnlyValues called', itemUuids);
                var promise = $http({
                    url: PATH.REST + '/content/teacher_only',
                    data: {
                        'itemUuids': itemUuids
                    },
                    method: 'POST',
                    cache: true // this might get called a lot, won't be changing likely during a session
                });

                promise
                    .then(function(response) {
                        $log.log('getTeacherOnlyValues success', response);
                    }, function(error) {
                        $log.error('failed to fetch teacherOnly values', error.errorCode, error.errorMessage);
                    });

                if (angular.isDefined(success) && angular.isFunction(success)) {
                    promise.success(success);
                }

                return promise;
            };

            Content.getContentStandards = function(id, version) {
                var deferred = $q.defer();

                Content.get({
                    contentId: id,
                    version: version
                }, false, true).then(
                    function(response) {
                        var program = response;
                        program.libraryDelimited = program.stateSpecificContent && program.parentProgramNames ?
                           program.parentProgramNames.join('|') : program.library.join('|');

                        Standard.getStandardTree(program.libraryDelimited, program).then(
                            function(tree) {
                                deferred.resolve({
                                    program: program,
                                    standards: tree
                                });
                            },
                            deferred.reject
                        );
                    },
                    deferred.reject
                );

                return deferred.promise;
            };

            Content.getQuestionBankStandards = function(id, version) {
                var deferred = $q.defer();

                Content.get({
                    contentId: id,
                    version: version
                }, false, true).then(
                    function(response) {
                        var program = response;
                        program.libraryDelimited = program.library.join('|');

                        Standard.getQuestionBankStandardTree(program.libraryDelimited, program).then(
                            function(tree) {
                                deferred.resolve({
                                    program: program,
                                    standards: tree
                                });
                            },
                            deferred.reject
                        );
                    },
                    deferred.reject
                );

                return deferred.promise;
            };

            Content.filterData = new KeyStore();

            // todo: this should go away after code freeze.  I don't believe it's
            // used anymore.
            Content.hasRemediation = function(item) {
                return item.$hasRemediation();
            };

            //Takes an array of ContentItem and display their customized as separate item
            Content.getListWithCustomizedTestInserted = function(contentArray) {
                var resultArray = [];

                angular.forEach(contentArray, function(contentItem) {
                    if (contentItem.mediaType === 'Test' && Content.hasCustomizedItem(contentItem) &&
                        !contentItem.hasCustomizedVersion) {
                        contentItem.hasCustomizedVersion = true;
                        resultArray.push(contentItem);
                    } else if (contentItem.fileType === 'Sequence' && contentItem.contentItems &&
                        contentItem.contentItems.length > 0) { //We need to go deeper
                        var childItems = contentItem.contentItems;
                        contentItem.contentItems = Content.getListWithCustomizedTestInserted(childItems);
                        resultArray.push(contentItem);
                    } else {
                        resultArray.push(contentItem);
                    }
                });
                return resultArray;
            };

            var getColumnCount = function(sidebarOpen) {
                var columnCount;
                //If Teacher Resource sidebar is open & if viewing in iPad portrait view then 2 columns are visible
                //If Teacher Resource sidebar is open & not in ipad portrait view then 3 columns are visible
                //If Teacher Resource sidebar is not open & viewing in ipad portrait view then 3 columns are visible
                //If Teacher Resource sidebar is not open & not viewing in ipad portrait view then 4 cols are visible
                if (sidebarOpen && !MediaQuery.breakpoint.isDesktop) {
                    columnCount = 2;
                } else if (sidebarOpen || !MediaQuery.breakpoint.isDesktop) {
                    columnCount = 3;
                } else if (MediaQuery.breakpoint.isDesktop) {
                    columnCount = 3;
                } else {
                    columnCount = 4;
                }

                return columnCount;
            };

            Content.prototype.isLastRow = function(index, contentItemsLength, sidebarOpen, itemPerRow) {
                var columnCount, lastRowItemCount;

                columnCount = itemPerRow ? itemPerRow : getColumnCount(sidebarOpen);

                lastRowItemCount = contentItemsLength % columnCount;

                if (lastRowItemCount === 0) {
                    return (index + 1) > (contentItemsLength - columnCount);
                } else {
                    return (index + 1) > (contentItemsLength - lastRowItemCount);
                }
            };

            Content.prototype.isLastColumn = function(index, sidebarOpen) {
                var columnCount = getColumnCount(sidebarOpen);

                return ((index + 1) % columnCount === 0);
            };

            Content.prototype.$updateTeacherOnly = function() {
                var self = this,
                    unknownIds = [],
                    yesCount = 0,
                    deferred = $q.defer(),
                    i, len;

                //$log.log('updating teacher only: ', self.id, self.teacherOnly);

                if (self.contentItems && self.contentItems.length > 0) {
                    for (i = 0, len = self.contentItems.length; i < len; i++) {
                        var child = self.contentItems[i];

                        // if any child item is NO already and it's not another sequence,
                        // then we are NO because all must be YES to be YES
                        if (!child.contentItems && child.teacherOnly === 'No') {
                            if (self.teacherOnly !== 'Yes') { // if we are already YES then it trumps any children
                                self.teacherOnly = 'No';
                            }
                        }

                        if (child.teacherOnly.toUpperCase() === 'UNKNOWN') {
                            unknownIds.push(child.id);
                        }

                        if (child.teacherOnly.toUpperCase() === 'YES') {
                            yesCount++;
                        }
                    }

                    // if all children are YES then so am I
                    if (yesCount === self.contentItems.length) {
                        self.teacherOnly = 'Yes';
                    }

                    // always update any unkowns
                    if (unknownIds.length > 0) {
                        Content.getTeacherOnlyValues(unknownIds)
                            .success(function(values) {
                                var key;
                                for (key in values) {
                                    if (values.hasOwnProperty(key)) {
                                        var item = $.Enumerable.From(self.contentItems)
                                            .Where('$.id == "' + key + '"')
                                            .FirstOrDefault(null);

                                        if (item !== null) {
                                            item.teacherOnly = values[key] ? 'Yes' : 'No';
                                        }
                                    }
                                }
                                deferred.resolve(self);
                            });
                    } else {
                        // if no unknowns leave it alone...
                        deferred.resolve(self);
                    }
                } else {
                    // if it has no child content items it should have it's own value set already
                    if (self.teacherOnly === 'UNKNOWN') {
                        Content.getTeacherOnlyValues([self.id])
                            .success(function(values) {
                                self.teacherOnly = values[self.id] ? 'Yes' : 'No';
                                deferred.resolve(self);
                            });
                    } else {
                        // if not unknown leave it alone...
                        deferred.resolve(self);
                    }
                }

                return deferred.promise;
            };

            /**
             * Get the title for an item.  If an active customized version exists, will fetch that title instead.
             *
             */
            Content.prototype.$getTitle = function(forceVersion) {
                var item,
                    title,
                    forceOriginal = forceVersion === 'original',
                    forceLatest = forceVersion === 'latest';

                if (forceLatest) {
                    item = this.$getDefaultVersion(forceLatest);
                } else {
                    item = forceOriginal ? this : this.$getDefaultVersion();
                }

                if (item.associativeProps && item.associativeProps.titleInSequence) {
                    title = item.associativeProps.titleInSequence;
                } else {
                    title = item.title;
                }

                return title;
            };

            Content.prototype.$getDescription = function() {
                var item = this.$getDefaultVersion();

                return item.text;
            };

            Content.prototype.$getEquellaItemId = function() {
                return this.id;
            };

            Content.prototype.$getDefaultVersion = function(forceLatest) {
                var item = this,
                    hasCustomizedItem = Content.hasCustomizedItem(item);

                if (!forceLatest && this.$isTest() && !this.myContent) { //excludes My Content
                    return item;
                } else {
                    return hasCustomizedItem ? new Content(item.customizedItem) : item;
                }
            };

            Content.prototype.isExternalResource = function() {
                var self = this;
                return self.isOpenEdItem() || self.$isGooruItem();
            };

            Content.prototype.$getUrl = function() {
                var url = this.url;

                if (!(/^(http|https):\/\//.test(url))) {
                    url = 'http://' + url;
                }
                if (this.mediaType === MEDIA_TYPE.PARTNER_LINK) {
                    url = 'rest/externaltool/content/view/' + this.id + '/' + this.version + '?launchUrl=' + url;
                    if ($rootScope.currentProgram) {
                        url = url + '&programId=' + $rootScope.currentProgram.id +
                            '&programVersion=' + $rootScope.currentProgram.version;
                    }
                }
                if (this.fileType === 'URL' && this.mediaType === MEDIA_TYPE.LEARNING_RESOURCE) {
                    url = 'program/' + $rootScope.currentProgram.id + '/' + $rootScope.currentProgram.version +
                        '/content/' + this.id + '/' + this.version;
                }

                return url;
            };

            Content.prototype.$hasRemediation = function() {
                var item = this;

                return !!item.$getDefaultVersion().remediationProperties &&
                    (item.fileType === 'TEST' || item.fileType === 'SCO' ||
                     item.fileType === CONTENT_CONSTANTS.FILE_TYPE.TIN_CAN_SCO);
            };

            Content.prototype.$hasRemediationActivities = function() {
                var item = this;
                // the property remediationSkills is set in resolve.js#buildRemediationMap
                return item.remediationSkills && !$.isEmptyObject(item.remediationSkills);

            };

            // determine if any of the items in the "info" modal are present
            Content.prototype.$hasInfo = function() {
                var cleanTags = [];
                angular.forEach(this.tags, function(tag) {
                    if ($.trim(tag).length > 0) {
                        cleanTags.push(tag);
                    }
                });
                this.tags = cleanTags;

                if (this.fileType === 'etext') {
                    return $.trim(this.text).length > 0;
                }

                var infoItemHasContent = function(infoItem) {
                    var isEmptyArray = _.isArray(infoItem) && _.isEmpty(infoItem.join('').trim()),
                        isEmptyString = _.isString(infoItem) && infoItem.trim().length === 0;
                    if (isEmptyArray || isEmptyString || !infoItem) {
                        return false;
                    }
                    return true;
                };

                var item = this,
                    // description, keywords, materials, standards, pacing
                    canHazText = infoItemHasContent(item.text),
                    canHazTags = infoItemHasContent(item.tags),
                    canHazMaterials = infoItemHasContent(item.materials),
                    canHazStandards = infoItemHasContent(item.standards),
                    canHazPacing = infoItemHasContent(item.pacing),
                    // Leveled Readers Info
                    canHazAuthor = infoItemHasContent(item.author),
                    canHazIsbn = infoItemHasContent(item.isbn),
                    canHazLexile = infoItemHasContent(item.lexile),
                    canHazGR = infoItemHasContent(item.guidedReading),
                    canHazRMM = infoItemHasContent(item.readingMaturityMetric),
                    canHazDRA = infoItemHasContent(item.developmentalReadingAssessment),
                    canHazQuantile = infoItemHasContent(item.quantile),
                    canHazCompSkills = infoItemHasContent(item.comprehensionSkills),
                    canHazTextFeatures = infoItemHasContent(item.textFeatures),
                    canHazGenres = infoItemHasContent(item.genres),
                    canHazContentAreas = infoItemHasContent(item.contentAreas);

                var isStudent = $rootScope.currentUser.isStudent;

                return canHazText || canHazTags || canHazStandards ||
                    (canHazMaterials && !isStudent) ||
                    (canHazPacing && !isStudent) ||
                    (canHazAuthor && !isStudent) ||
                    (canHazIsbn && !isStudent) ||
                    (canHazLexile && !isStudent) ||
                    (canHazGR && !isStudent) ||
                    (canHazRMM && !isStudent) ||
                    (canHazDRA && !isStudent) ||
                    (canHazQuantile && !isStudent) ||
                    (canHazCompSkills && !isStudent) ||
                    (canHazTextFeatures && !isStudent) ||
                    (canHazGenres && !isStudent) ||
                    (canHazContentAreas && !isStudent);
            };

            Content.prototype.$isCustomized = function() {
                var item = this;

                return item.customizedItem && item.customizedItemDefaultView;
            };

            Content.prototype.$getCustomizeContribDate = function() {
                var item = this;
                return item.$getDefaultVersion().contribDate;
            };

            // Is current item a pearson item
            Content.prototype.$isPearsonItem = function() {
                var self = this;
                return self.contribSource === CONTRIBUTOR_SOURCE.PEARSON;
            };

            // should the item have an assign link? or just want to know if it can be assigned...
            Content.prototype.$isAssignable = function(toolBarAssign) {
                var item = this;
                if (item.teacherOnly === 'UNKNOWN') {
                    $log.log('Unresolved unknown teacherOnly', item);
                }
                return $rootScope.currentUser.hasRole('ROLE_TEACHER') &&
                    item.teacherOnly === 'No' &&
                    item.mediaType !== 'Tier' &&
                    item.mediaType !== 'Center' &&
                    item.mediaType !== 'Playlist' &&
                    item.mediaType !== MEDIA_TYPE.LESSON || (item.mediaType === MEDIA_TYPE.LESSON && toolBarAssign);
            };

            Content.prototype.isAssignableToPlaylist = function() {
                var item = this;
                if (item.teacherOnly === 'UNKNOWN') {
                    $log.log('Unresolved unknown teacherOnly', item);
                }
                var isTeacher = $currentUser.isTeacher;
                var restrictedMediaType = [
                    MEDIA_TYPE.TIER,
                    MEDIA_TYPE.CENTER,
                    MEDIA_TYPE.REMEDIATION,
                    MEDIA_TYPE.STUDENT_VOICE,
                    MEDIA_TYPE.LEARNING_MODEL,
                    MEDIA_TYPE.PLAYLIST,
                    MEDIA_TYPE.LESSON,
                    MEDIA_TYPE.DESMOS,
                    MEDIA_TYPE.NOTATION,
                    MEDIA_TYPE.CENTER_CONTAINER,
                    MEDIA_TYPE.QUESTION_BANK,
                ];
                var isRestrictedMediaType = restrictedMediaType.indexOf(item.mediaType) > -1;
                return isTeacher && !isRestrictedMediaType;
            };

            Content.prototype.$isPublishable = function() {
                var item = this;

                return $rootScope.currentUser.isContentPromoter && !item.$isCustomized();
            };

            // takes a path that has multiple tiers, and adds numbers to them
            var tierSplicer = function(path) {
                var r = /tier/g,
                    match = null,
                    idx = 0,
                    count = 0,
                    result = path;

                match = r.exec(path);
                while (match) {
                    count++;
                    //$log.log("splicer", match, match.index, count);
                    if (count > 1) {
                        // double digits might break this, but is unlikely to happen
                        idx = match.index + 4 + (count - 2);
                        result = result.slice(0, idx) + count + result.slice(idx);
                        //$log.log("idx", idx, result);
                    }
                    match = r.exec(path);
                }

                return result;
            };

            Content.prototype.$getValidFromDetails = function() {
                var item = this;
                if (!item.fromDetailsTrees) {
                    return [];
                }
                return _.filter(item.fromDetailsTrees, function(fromDetail) {
                    return fromDetail.distanceFrom === 1 && (fromDetail.containerMediaType ===
                        'Program' ||
                        fromDetail.containerMediaType === 'Tier' ||
                        fromDetail.containerMediaType === 'Lesson' ||
                        fromDetail.containerMediaType === 'Learning Model');
                });
            };

            Content.prototype.$buildFromDetailsTree = function() {
                var self = this,
                    trees = [],
                    currentTree = null,
                    workingTree = null,
                    lastDistance = 100;

                $.Enumerable.From(self.fromDetails).ForEach(function(detail) {
                    if (detail.containerMediaType === 'Tier' && detail.root) {
                        detail.containerMediaType = 'Program';
                    }

                    if (detail.distanceFrom <= lastDistance) {
                        if (lastDistance !== 100) {
                            // adjust path for multi-tier
                            currentTree.path = tierSplicer(currentTree.path);
                            trees.push(currentTree);
                        }
                        // new tree
                        currentTree = angular.copy(detail);
                        workingTree = currentTree;
                        if (currentTree.containerMediaType !== 'Learning Model') {
                            currentTree.treeTitle = currentTree.containerTitle;
                            currentTree.path = [
                                currentTree.containerMediaType.toLowerCase(),
                                currentTree.parentItemUuid,
                                0
                            ].join('/');
                        } else {
                            currentTree.treeTitle = '';
                            currentTree.path = '';
                        }
                    } else {
                        workingTree.parent = angular.copy(detail);
                        workingTree = workingTree.parent;
                        if (workingTree.containerMediaType !== 'Learning Model') { // LM doesn't count, it's Lesson
                            if (currentTree.treeTitle === '') {
                                currentTree.treeTitle = workingTree.containerTitle;
                                currentTree.path = [
                                    workingTree.containerMediaType.toLowerCase(),
                                    workingTree.parentItemUuid,
                                    0
                                ].join('/');
                            } else {
                                currentTree.treeTitle = currentTree.treeTitle + ' : ' + workingTree.containerTitle;
                                currentTree.path = [
                                    workingTree.containerMediaType.toLowerCase(),
                                    workingTree.parentItemUuid,
                                    0,
                                    currentTree.path
                                ].join('/');
                            }
                        }
                    }

                    lastDistance = detail.distanceFrom;
                });

                // push final tree
                if (currentTree) {
                    // adjust path for multi-tier
                    currentTree.path = tierSplicer(currentTree.path);
                    trees.push(currentTree);
                }

                self.fromDetailsTrees = trees;
                self.fromDetailsForSearch = self.$getValidFromDetails();
            };

            Content.prototype.$getThumbnailUrl = function(page, showLarge) {
                var item = this;

                if (item.isOpenEdItem()) {
                    return item.thumbnailUrls.length ? item.thumbnailUrls[0] : undefined;
                }

                // root level items (programs) expect the thumbnailLocation to be populated
                // non root items expect the thumbnailUrls to be populated
                if ((!item.thumbnailLocation && item.root) || (!item.thumbnailUrls && !item.root)) {
                    return;
                }

                var thumbnailPath = '';
                var thumbnailName = '',
                    thumbnailUrl = '',
                    expectedThumbnailName = '',
                    retinaThumbnailName = '',
                    nonRetinaThumbnailName = '',
                    fallbackThumbnailName = '';
                var uxPath = '';
                var retinaExtension = '',
                    defaultRetina = '@2x',
                    thumbnailExtension = '',
                    defaultExtension = '.png',
                    isFullPathToThumbnail;

                if (BrowserInfo.isHDDisplay) {
                    retinaExtension = '@2x';
                }

                //case: program
                if (item.root) {
                    isFullPathToThumbnail = item.thumbnailLocation.search(/^http(s)?|\//) === 0;
                    if (!isFullPathToThumbnail) {
                        item.thumbnailLocation = PATH.SHARED_THUMBNAILS + '/' + item.thumbnailLocation;
                    }

                    thumbnailPath = $filter('removeExtension')(item.thumbnailLocation);

                    if (page === 'HOME') {
                        uxPath = (showLarge) ? '_homelarge' : '_homesmall';
                    } else if (page === 'PROGRAM_SUBNAV') {
                        uxPath = '_dropdown';
                    } else {
                        uxPath = '_course';
                    }

                    thumbnailExtension = $filter('getExtension')(item.thumbnailLocation, defaultExtension);

                    return thumbnailPath + uxPath + retinaExtension + thumbnailExtension;

                } else if (item.isGroupedContent && page === 'PROGRAM') { //case: grouped content
                    isFullPathToThumbnail = angular.isDefined(item.programThumbnailLocation) &&
                        item.programThumbnailLocation.search(/^http(s)?|\//) === 0;
                    if (!isFullPathToThumbnail) {
                        item.programThumbnailLocation = PATH.SHARED_THUMBNAILS + '/' + item.programThumbnailLocation;
                    }

                    thumbnailPath = $filter('removeExtension')(item.programThumbnailLocation);

                    if (page === 'HOME') {
                        uxPath = (showLarge) ? '_homelarge' : '_homesmall';
                    } else if (page === 'PROGRAM_SUBNAV') {
                        uxPath = '_dropdown';
                    } else {
                        uxPath = '_course';
                    }

                    thumbnailExtension = $filter('getExtension')(item.programThumbnailLocation, defaultExtension);

                    return thumbnailPath + uxPath + retinaExtension + thumbnailExtension;
                } else {
                    //case: tier
                    if (page === 'TIER') {
                        if (showLarge) {
                            uxPath = '_grid';
                        }
                    }

                    // get image name only without @2x and _grid
                    // since the thumbnailLocation for sco's won't have valid DCTM FSS path with file name
                    //changing it to item.thumbnailUrls[0] which will have valid thumbnail file name always.
                    thumbnailName = $filter('getFileName')(item.thumbnailUrls[0]);
                    thumbnailExtension = $filter('getExtension')(item.thumbnailUrls[0], defaultExtension);
                    // ideal thumbnail name as per view grid/list and device retina/non retina
                    expectedThumbnailName = thumbnailName + uxPath + retinaExtension + thumbnailExtension;
                    // @2x thumbnail name
                    retinaThumbnailName = thumbnailName + uxPath + defaultRetina + thumbnailExtension;
                    // @1x thumbnail name
                    nonRetinaThumbnailName = thumbnailName + uxPath + thumbnailExtension;

                    thumbnailUrl = _.find(item.thumbnailUrls, function(url) {
                        return url.search(expectedThumbnailName) > -1;
                    });

                    // if ideal thumbnail name not found in thumbnailUrls array
                    // look for fallback thumbnail - @1x version if Retina device or @2x version if non retina
                    if (!thumbnailUrl) {
                        fallbackThumbnailName = BrowserInfo.isHDDisplay ? nonRetinaThumbnailName :
                            retinaThumbnailName;

                        thumbnailUrl = _.find(item.thumbnailUrls, function(url) {
                            return url.search(fallbackThumbnailName) > -1;
                        });
                    }

                    return thumbnailUrl;
                }
            };

            Content.prototype.$propagateAssociativeProps = function(parent) {
                var item = this,
                    associativePropsReady = $q.defer();

                //Items's associativeProps is stored already
                if ($rootScope.openedItem && $rootScope.openedItem.id === item.id) {
                    item.associativeProps = $rootScope.openedItem.associativeProps;

                    associativePropsReady.resolve();

                    //Item's associativeProps not available. Happens when user refreshes page.
                    //Need to re-fetch parent.
                } else if (!parent.id || !parent.version) {
                    //Cannot fetch parent w/o id or version
                    associativePropsReady.resolve();
                } else {
                    Content.get({
                        contentId: parent.id,
                        version: parent.version,
                        levels: 1
                    }, true).then(function(fullParentData) {
                        var itemInParentContext = $.Enumerable.From(fullParentData.contentItems)
                            .Where('$.id == \'' + item.id + '\'')
                            .FirstOrDefault(null);

                        //TODO titleInSequence is still lost when opening item from teacher support
                        item.associativeProps = itemInParentContext ? itemInParentContext.associativeProps :
                            null;
                        associativePropsReady.resolve();
                    });
                }

                return associativePropsReady.promise;
            };

            Content.prototype.$isScoOrTest = function() {
                return this.fileType === 'SCO' || this.fileType === 'TEST' ||
                this.fileType === CONTENT_CONSTANTS.FILE_TYPE.TIN_CAN_SCO;
            };

            Content.prototype.$isScorable = function() {
                return this.$isScoOrTest();
            };

            Content.prototype.$isReviewerContainer = function() {
                if (this.externalSource) {
                    return this.externalSource.toUpperCase() === 'STANDARD';
                }

                return false;
            };

            Content.prototype.$isLesson = function() {
                return this.mediaType === MEDIA_TYPE.LESSON;
            };

            Content.prototype.isPlaylist = function() {
                return this.mediaType === MEDIA_TYPE.PLAYLIST;
            };

            Content.prototype.isTier = function() {
                return this.mediaType === MEDIA_TYPE.TIER;
            };

            Content.prototype.isRRS = function() {
                return this.mediaType ===  MEDIA_TYPE.REALIZE_READER_SELECTION;
            };

            Content.prototype.$hasCustomizedLesson = function() {
                return this.$isLesson() && this.customizedItemDefaultView &&
                    (this.contribSource === CONTRIBUTOR_SOURCE.SAVVAS ||
                        this.contribSource === CONTRIBUTOR_SOURCE.PEARSON);
            };

            Content.prototype.$isTest = function() {
                return this.mediaType === 'Test';
            };

            Content.prototype.$hasCustomizedTest = function() {
                return !!(this.$isTest() && this.customizedItem && this.hasCustomizedVersion);
            };
            //originalItemId added to differentiate between my content and customized version
            Content.prototype.$isCustomizedTest = function() {
                return !!(this.$isTest() && (this.isCustomizedVersion || this.originalItemId));
            };

            Content.prototype.$isStudentVoice = function() {
                return this.mediaType === 'Student Voice';
            };

            Content.prototype.$isTestNavTest = function() {
                return this.$isTest() && this.playerTarget === 'testnav';
            };

            Content.prototype.$isNativeTest = function() {
                return this.$isTest() && (this.playerTarget === 'realize' || this.playerTarget === '');
            };

            Content.prototype.isDiscussionPrompt = function() {
                return this.mediaType === MEDIA_TYPE.DISCUSSION_PROMPT;
            };

            Content.prototype.$getAssignedStatus = function() {
                var url = PATH.REST + '/items/' + this.id + '/assignmentStatus';
                var promise = $http.get(url)
                    .then(function(response) {
                        return response.data.replace(/"/g, '');//Get rid of double quotes;
                    }, function(err) {
                        return $q.reject('error getting item assigned status', err);
                    });

                return promise;
            };

            Content.prototype.$isAssigned = function() {
                var promise = this.$getAssignedStatus().then(function(status) {
                    return status === 'ASSIGNED';
                });
                return promise;
            };

            Content.prototype.$isCenterProgram = function() {
                var self = this;
                return !!(self.root && self.centersProperties && self.centersProperties.itemUuid !== null);
            };

            function isExternalItem(externalSource, self) {
                if (!self.fileType) { //Broken content item
                    return false;
                }

                // check if the item's contributor or source matches given external provider name
                var externalSourceLowerCase = externalSource.toLowerCase();
                var contributor;
                var source;
                if (self.contribSource) {
                    contributor = (self.contribSource).toLowerCase();
                }
                if (self.externalSource) {
                    source = (self.externalSource).toLowerCase();
                }
                return contributor === externalSourceLowerCase || source === externalSourceLowerCase;
            }

            Content.prototype.$isGooruItem = function() {
                return !!this.gooruOid || isExternalItem(CONTENT_CONSTANTS.FILE_TYPE.GOORU, this);
            };

            Content.prototype.isOpenEdItem = function() {
                return isExternalItem(CONTENT_CONSTANTS.FILE_TYPE.OPEN_ED, this);
            };

            Content.prototype.getExternalResourceDefaultImage = function() {
                if (isExternalItem(CONTENT_CONSTANTS.FILE_TYPE.OPEN_ED, this)) {
                    return '/opened_thumbnail_default.png';
                } else if (isExternalItem(CONTENT_CONSTANTS.FILE_TYPE.GOORU, this)) {
                    return '/gooru_icon.png';
                }
            };

            Content.prototype.$getLessonItems = function() {
                var self = this,
                    childContents = [];

                angular.forEach(self.contentItems, function(level1) {
                    if (level1.mediaType !== 'Learning Model') {
                        childContents.push(level1);
                    } else {
                        angular.forEach(level1.contentItems, function(item) {
                            // For distinguishing if item came from learning model
                            item.fromLearningModel = true;
                            childContents.push(item);
                        });
                    }
                });
                return childContents;
            };

            Content.prototype.getRRSActivities = function() {
                var RRSActivities = [];

                return this.getItemContainer(MEDIA_TYPE.ACTIVITY_SUPPORT)
                    .then(function(response) {
                        var responseObj = response.data;
                        if (responseObj && responseObj.contentItems && responseObj.contentItems.length > 0) {
                            RRSActivities = responseObj.contentItems;
                        }
                        return RRSActivities;
                    }, function(error) {
                        $log.error('Failed to get activity support container:', error);
                        return error;
                    });
            };

            Content.prototype.getItemContainer = function(type) {
                var endpoint = [
                    PATH.REST,
                    'items',
                    this.id,
                    'container'
                ].join('/');

                return $http.get(endpoint, {
                    params: {
                        mediaType: type
                    }
                });
            };

            Content.prototype.isLtiItem = function() {
                return this.mediaType === 'Partner Link';
            };

            Content.getLtiLaunchInfo = function(contentId, contentVersion, optionalParams) {
                var endpoint = [
                    PATH.REST,
                    'externaltool',
                    'content',
                    contentId
                ];

                if (contentVersion) {
                    endpoint.push(contentVersion);
                }

                var ltiEndpoint = endpoint.join('/');

                return $http.get(ltiEndpoint, {
                    params: optionalParams
                }).then(function(response) {
                    //only in this call, server returns it as string "true" or "false" instead of boolean
                    response.data.settings.openNewWindow = JSON.parse(response.data.settings.openNewWindow);
                    return response.data;
                });
            };

            var isSSOUrlDetailsAvailable = function() {
                return $currentUser.getAttribute('rumba.ssourldetails');
            };

            Content.prototype.getClassroomShareUrl = function() {
                var deferred = $q.defer(),
                    item = this.$getDefaultVersion(),
                    paths = $location.absUrl().split('?'),
                    path = paths[0],
                    queryParams = paths.length > 1 ? paths[1] : '',
                    target = item.$isLesson() ? 'lesson' : 'content',
                    contentPath = [path, target, item.id, item.version].join('/'),
                    ssoUrlDetails,
                    prepareShareUrl = function(ssoUrlDetails) {
                        var shareUrl = ssoUrlDetails.rumbaLoginUrl + '?service=' + contentPath;

                        if (ssoUrlDetails.idpDataUrl) {
                            shareUrl = shareUrl + '&idpmetadata=' + ssoUrlDetails.idpDataUrl;
                        }
                        if (ssoUrlDetails.EBTenant) {
                            shareUrl = shareUrl + '&EBTenant=' + ssoUrlDetails.EBTenant;
                        }
                        if (queryParams) {
                            shareUrl +=  '&' + queryParams;
                        }

                        return shareUrl;
                    };

                if (isSSOUrlDetailsAvailable()) {
                    ssoUrlDetails = $currentUser.getAttribute('rumba.ssourldetails');
                    deferred.resolve(prepareShareUrl(ssoUrlDetails));
                } else {
                    User.getSSOUrlDetails()
                        .then(function(ssoUrlDetails) {
                            if (ssoUrlDetails) {
                                var defaultUrlDetails = {
                                    rumbaLoginUrl: ssoUrlDetails.rumbaLoginUrl,
                                    idpDataUrl: ssoUrlDetails.idpDataUrl
                                };
                                if (ssoUrlDetails.EBTenant) {
                                    angular.extend(defaultUrlDetails, {
                                        EBTenant: ssoUrlDetails.EBTenant
                                    });
                                }
                                $currentUser.setAttribute('rumba.ssourldetails', defaultUrlDetails, false);
                                return deferred.resolve(prepareShareUrl(ssoUrlDetails));
                            }
                        }, function(error) {
                            deferred.reject(error);
                        });
                }

                return deferred.promise;
            };

            Content.prototype.requiresGoogleHeadsupAlert = function() {
                return (this.fileType === CONTENT_CONSTANTS.FILE_TYPE.SEQUENCE) && this.$isLesson();
            };

            Content.prototype.isLesson = Content.prototype.$isLesson;
            Content.prototype.isScorable = Content.prototype.$isScorable;
            Content.prototype.getTitle = Content.prototype.$getTitle;
            Content.prototype.getLessonItems = Content.prototype.$getLessonItems;
            Content.prototype.hasInfo = Content.prototype.$hasInfo;
            Content.prototype.isCustomizedTest = Content.prototype.$isCustomizedTest;

            Content.prototype.isModeratingNonCustomizedItem = function() {
                var item = this;
                return (item.status === 'SUBMITTED' && !(item.$isCustomizedTest() ||
                    item.$hasCustomizedLesson() || item.contribSource === CONTRIBUTOR_SOURCE.MY_UPLOADS ||
                    item.contribSource === 'OpenEd' || item.contribSource === 'NBC Learn')) ?
                    'isModeratingNonCustomizedItem' : '';
            };

            return Content;
        }
    ]);
