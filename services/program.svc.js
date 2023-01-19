 // TODO: use Realize.content ? (OLE doesn't have Programs, so perhaps it's platform specific)
angular.module('RealizeDataServices.ProgramService', [
    'Realize.content.model.contentItem',
    'Realize.paths',
    'Realize.common.optionalFeaturesService'
])
    .service('ProgramService', [
        '$log',
        '$q',
        '$cacheFactory',
        'Content',
        '$http',
        'MEDIA_TYPE',
        'PATH',
        function($log, $q, $cacheFactory, Content, $http, MEDIA_TYPE, PATH) {
            'use strict';

            var svc = this,
                cache = $cacheFactory('ProgramCache'),
                allStateProgramsUrl = [PATH.REST, 'allPrograms'].join('/'),
                allProgramsUrl = [PATH.REST, 'programs'].join('/');

            svc.get = function(id, version) {
                var key = id + '_' + version,
                    existingProgram = cache.get(key);

                if (!existingProgram) {
                    return Content.get({
                        contentId: id,
                        version: version
                    })
                        .then(function(program) {
                            cache.put(key, program);
                            return program;
                        }, function(err) {
                            $log.error('Program Service: error getting program data!', err);
                            return $q.reject(err);
                        });
                } else {
                    return $q.when(existingProgram);
                }
            };

            var loadAssociatedObject = function(program, object) {
                if (!program[object]) {
                    return $q.reject('Program has no ' + object);
                }

                if (!program[object].contentItems) {
                    program[object].contentItems = [];
                }

                if (program[object].contentItems.length === 0) {
                    return Content.get({
                        contentId: program[object].id,
                        version: program[object].version
                    })
                        .then(function(item) {
                            angular.copy(item, program[object]);
                            return item;
                        }, function(err) {
                            $log.error('Program Service: error loading ' + object + ' for: ', program);
                            return $q.reject(err);
                        });
                } else {
                    return $q.when(program[object]);
                }
            };

            svc.loadAssociatedTools = function(program) {
                return loadAssociatedObject(program, 'associatedTools');
            };

            svc.loadAssociatedTeacherSupport = function(program) {
                return loadAssociatedObject(program, 'associatedTeacherSupport');
            };

            svc.getAllStatePrograms = function() {
                var promise = null,
                programUrl = allStateProgramsUrl;
                promise = $http.get(programUrl, {cache: true})
                    .then(function(response) {
                        $log.log('program getAllStatePrograms success handler');
                        var results = [];

                        angular.forEach(response.data.results, function(program) {
                            results.push(new Content(program));
                        });
                        return {results: results, totalMatches: response.data.totalMatches};
                    });
                return promise;
            };

            svc.getAllPrograms = function() {
                var promise = null;
                promise = $http.get(allProgramsUrl, {cache: true})
                    .then(function(response) {
                        $log.log('program getAllPrograms success handler');
                        var results = [];

                        angular.forEach(response.data.results, function(program) {
                            results.push(new Content(program));
                        });
                        return {results: results, totalMatches: response.data.totalMatches};
                    });
                return promise;
            };

            svc.getProgramByName = function(name) {
                return svc.getAllPrograms().then(function(programs) {
                    var program = _.find(programs, function(program) {
                        return program.name === name;
                    });

                    return program ? program.id : $q.reject('');
                });
            };

            svc.getAllCenters = function() {
                var promise = null;
                var url = [PATH.REST, 'centers'].join('/');
                promise = $http.get(url, {cache: true})
                    .then(function(response) {
                        $log.log('program getAllCenters success handler');
                        var results = [];

                        angular.forEach(response.data.results, function(program) {
                            results.push(new Content(program));
                        });
                        return {results: results, totalMatches: response.data.totalMatches};
                    });
                return promise;
            };
            svc.getEssayPromptAccess = function(contentItem) {
                var url = [PATH.REST, 'essayPrompts'].join('/'),
                programs = {programs: angular.toJson(contentItem.programs)};
                return $http.get(url, {params: programs}).then(function(response) {
                    //converting the data to string because the server is returning
                    //boolean value but mocking of boolean value as a response data
                    //is not supported by the httpBackend for e2e and unit test cases
                    // so to support the application and the test cases converted it
                    //to string in both side, and mocked with string
                    return response.data.toString() === 'true';
                });
            };

            svc.addCustomisedItemstoList = function(customisedVersions, originalId, contentItems) {
                contentItems.map(function(item, index) {
                    if (item.mediaType !== MEDIA_TYPE.LEARNING_MODEL) {
                        if (item.id === originalId) {
                            contentItems[index].showCustomisedVersions = true;
                            angular.forEach(customisedVersions, function(customisedItem, versionIndex) {
                                contentItems.splice(index + versionIndex + 1, 0, customisedItem);
                            });
                        }
                    } else {
                        item.contentItems.map(function(learningModelItem, learningModelIndex) {
                            if (learningModelItem.id === originalId) {
                                item.contentItems[learningModelIndex].showCustomisedVersions = true;
                                angular.forEach(customisedVersions, function(customisedItem, versionIndex) {
                                    item.contentItems.splice(learningModelIndex + versionIndex + 1, 0, customisedItem);
                                });
                            }
                        });
                    }
                });
                return contentItems;
            };

            svc.removeCustomisedItemsfromList = function(contentItem, contentItems) {
                contentItems = contentItems.filter(function(item, index) {
                    if (item.mediaType !== MEDIA_TYPE.LEARNING_MODEL) {
                        if (item.id === contentItem.id) {
                            contentItems[index].showCustomisedVersions = false;
                        }
                        return item.originalItemId !== contentItem.id;
                    } else {
                        if (item.contentItems) {
                            item.contentItems = item.contentItems
                                .filter(function(learningModelItem, learningModelIndex) {
                                    if (learningModelItem.id === contentItem.id) {
                                        item.contentItems[learningModelIndex].showCustomisedVersions = false;
                                    }
                                    return learningModelItem.originalItemId !== contentItem.id;
                                });
                        }
                        return true;
                    }
                });
                return contentItems;
            };

            var learnignModelFilter = function(learningModel) {
                if (!learningModel) {
                    return false;
                }
                var childContenItem = learningModel.contentItems.filter(function(childItem) {
                    return childItem.associativeProps && childItem.associativeProps.isDistanceLearning === 'true';
                });
                if (!childContenItem || !childContenItem.length) {
                    return false;
                }
                learningModel.contentItems = childContenItem;
                return true;
            };
            svc.filterDistanceLearningContent = function(contentItems) {
                var filteredDistanceLearningContentItems = contentItems.filter(function(item) {
                    if (item.mediaType !== MEDIA_TYPE.LEARNING_MODEL) {
                        return item.associativeProps && item.associativeProps.isDistanceLearning === 'true';
                    } else {
                        return learnignModelFilter(item);
                    }
                });
                return filteredDistanceLearningContentItems;
            };
        }
    ]);
