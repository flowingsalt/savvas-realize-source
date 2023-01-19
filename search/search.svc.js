angular.module('RealizeApp')
    .service('SearchSvc', [
        '$rootScope',
        '$location',
        '$filter',
        'MEDIA_TYPE',
        'webStorage',
        function($rootScope, $location, $filter, MEDIA_TYPE, webStorage) {
            'use strict';

            // TODO retrieve from a rest call?
            // order of array determines order of appearance in UI
            var TEACHER_FACETS = [
                'DISTANCE_LEARNING', 'FEATURED_RESOURCES', 'GRADE', 'TEACHER_ONLY', 'RUBRIC', 'MEDIA_TYPE',
                'CONTENT_TYPE', 'SOURCE', 'LIBRARY_TITLE', 'COMPREHENSION_SKILLS', 'TEXT_FEATURES', 'GENRES',
                'CONTENT_AREAS', 'LANGUAGE'
            ];
            var STUDENT_FACETS = ['MEDIA_TYPE', 'RUBRIC', 'CONTENT_TYPE', 'SOURCE', 'LIBRARY_TITLE', 'LANGUAGE'];
            var breadcrumbDetails = [];
            var singleBreadcrumbDetails = [];
            var breadcrumbPath;

            this.INCLUDED_FACETS = ($rootScope.currentUser.isStudent) ? STUDENT_FACETS : TEACHER_FACETS;

            this.sortFacets = function(facets) {
                var sortedFacets = {}, i;

                for (i = 0; i < facets.length; i++) {
                    // strip out any weird values
                    if (facets[i].fieldName === 'TEACHER_ONLY') {
                        facets[i].values = $.Enumerable.From(facets[i].values)
                            .Where('$.value === \'Yes\' || $.value === \'No\'').ToArray();
                    }
                    var index = $.inArray(facets[i].fieldName, this.INCLUDED_FACETS);
                    if (index !== -1) {
                        sortedFacets[index] = facets[i];
                    }
                }

                return sortedFacets;
            };

            this.calculateResultCountIndexes = function(pageSize, currentPage, totalMatches) {
                var indexes = {};

                indexes.start = 1 + (pageSize * (currentPage - 1));
                indexes.end = indexes.start + pageSize - 1;

                if (indexes.end > totalMatches) {
                    indexes.end = totalMatches;
                }

                return indexes;
            };

            this.getFacetMap = function(facets) {
                var facetMap = {};

                angular.forEach(facets, function(facet) {
                    facetMap[facet.fieldName] = {};

                    angular.forEach(facet.values, function(value) {
                        if (!value.displayName) {
                            value.displayName = value.value;
                        }
                        value.facet = facet.fieldName;
                        facetMap[facet.fieldName][value.value] = value;
                    });
                });

                // rename "My Uploads" to "My Content" per UX spec
                // renaming through a filter would add a lot of unnecessary overhead
                if (facetMap.SOURCE && angular.isDefined(facetMap.SOURCE['My Uploads'])) {
                    facetMap.SOURCE['My Uploads'].displayName = 'My Content';
                }

                //as per UX mock rename true/false to Has Rubric(s)/No Rubric(s)
                if (facetMap.RUBRIC) {
                    if (facetMap.RUBRIC.true) {
                        facetMap.RUBRIC.true.displayName = 'Has Rubric(s)';
                    }
                    if (facetMap.RUBRIC.false) {
                        facetMap.RUBRIC.false.displayName = 'No Rubric(s)';
                    }
                }
                return facetMap;
            };
            this.groupResults = function(resultList, groupBy) {
                return _.chain(resultList)
                    .groupBy(function(item) {
                        return item[groupBy] ? item[groupBy] : Math.random();
                    })
                    .map(function(arrObj) {
                        var res;
                        if (arrObj.length === 1) {
                            res =  arrObj[0];
                        } else {
                            res = angular.copy(arrObj[0]);
                            res.contentGroup = arrObj;
                        }
                        return res;
                    })
                    .value();
            };

            var getSingleBreadcrumbHierarchy = function(item) {
                if (item.containerMediaType !== MEDIA_TYPE.LEARNING_MODEL) {
                    var tempPath = breadcrumbPath.split(item.parentItemUuid);
                    var isRemediation = item.containerMediaType.indexOf(MEDIA_TYPE.REMEDIATION) !== -1;
                    var breadcrumbUrl = isRemediation ? tempPath[0] : tempPath[0] + item.parentItemUuid + '/0';
                    var breadcrumbItem = {
                        id: item.parentItemUuid,
                        title: item.containerTitle,
                        url: breadcrumbUrl
                    };
                    singleBreadcrumbDetails.push(breadcrumbItem);
                }
                if (item.hasOwnProperty('parent')) {
                    getSingleBreadcrumbHierarchy(item.parent);
                }
            };

            this.getBreadcrumbHierarchy = function(fromDetails, programs) {
                breadcrumbDetails = [];
                _.map(fromDetails, function(item) {
                    singleBreadcrumbDetails = [];
                    breadcrumbPath = item.path;
                    getSingleBreadcrumbHierarchy(item);
                    var singleBCLength = singleBreadcrumbDetails.length;
                    var programId = singleBCLength >= 1 ? singleBreadcrumbDetails[singleBCLength - 1].id : null;
                    var subscribedPrograms = $filter('filter')(programs, {id: programId}, true);
                    if (subscribedPrograms && subscribedPrograms.length > 0) {
                        breadcrumbDetails.push(singleBreadcrumbDetails.reverse());
                    }
                });
                return breadcrumbDetails;
            };

            this.navigateToSourceProgram = function(url) {
                // remove search query param and navigate to breadcrumb path
                $location.search('keywords', null);
                $location.path(url);
            };

            this.storeContentFromDetails = function(item) {
                var contentFromDetails = _.isEmpty(item.fromDetails) ? null : item.fromDetails;
                if (contentFromDetails) {
                    webStorage.add('contentFromDetails', contentFromDetails);
                } else {
                    webStorage.remove('contentFromDetails');
                }
            };

            this.addMyContent = function(results) {
                angular.forEach(results, function(result) {
                    if (result.contribSource === 'My Uploads' && !result.originalItemId) {
                        result.myContent = true;
                    }
                });
                return results;
            };
        }
    ]);
