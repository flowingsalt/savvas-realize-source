angular.module('Realize.standards.standardDataService', [
    'Realize.paths'
])
    .service('Standard', [
        '$q',
        '$rootScope',
        '$log',
        '$http',
        'PATH',
        function($q, $rootScope, $log, $http, PATH) {
            'use strict';

            var svc = {},
                listOfOpenStandards = {};

            svc.get = function(params) {
                return $http.get(PATH.REST + '/standards/libraries', {params: params}).then(
                    function(response) {
                        return response.data;
                    }
                );
            };

            svc.isOpen = function(id) {
                return listOfOpenStandards.hasOwnProperty(id);
            };

            svc.setOpen = function(id) {
                listOfOpenStandards[id] = id;
            };

            svc.setClosed = function(id) {
                delete listOfOpenStandards[id];
            };

            svc.clearOpenStandards = function() {
                listOfOpenStandards = {};
            };

            svc.getChildrenStandards = function(id, names) {

                var url = PATH.REST + '/standards/children?id=' + encodeURIComponent(id.replace(/\\/g, '\\'));
                if (names) {
                    url = url + '&programNames=' + encodeURIComponent(names.replace(/\\/g, '\\'));
                }

                return $http.get(url).then(
                    function(response) {
                        return response.data;
                    }
                );
            };

            svc.processStandards = function(standard, lang) {
                svc.localeDescription(standard, lang);
                angular.forEach(standard.children, function(childStandard) {
                    if (!childStandard.grade || childStandard.grade === 'null') {
                        childStandard.grade = standard.grade;
                    }
                    svc.processStandards(childStandard, lang);
                });
            };

            svc.getStandardTree = function(names, program) {
                var deferred = $q.defer();
                svc.get({'programNames': names}).then(function(response) {
                    var standardsMap = {},
                        grades = [],
                        promises = [],
                        data = response;

                    data = _.toArray(data);
                    data = _.flatten(data);

                    angular.forEach(data, function(standardInfo) {
                        promises.push(
                            svc.getChildrenStandards(standardInfo.id, names).then(function(standardArray) {
                                angular.forEach(standardArray, function(standard) {
                                    if (!standard.grade || standard.grade === 'null') {
                                        standard.grade = standardInfo.grade;
                                    }

                                    if (!angular.isDefined(standardsMap[standardInfo.grade])) {
                                        standardsMap[standardInfo.grade] = [];
                                    }

                                    grades = grades.concat(standardInfo.grade);

                                    if (standard.number) {
                                        standardsMap[standardInfo.grade] =
                                            standardsMap[standardInfo.grade].concat(standard);
                                    } else {
                                        standardsMap[standardInfo.grade] =
                                            standardsMap[standardInfo.grade].concat(standard.children);
                                    }
                                    svc.processStandards(standard, program.language);
                                });
                            })
                        );
                    });

                    $q.all(promises).then(function() {
                        deferred.resolve({
                            map: standardsMap,
                            grades: grades
                        });
                    }, deferred.reject);
                });

                return deferred.promise;
            };

            svc.getQuestionBankStandardTree = function(names, program) {
                var deferred = $q.defer(),
                    params = {'programNames': names};

                $http.get(PATH.REST + '/standards/questionbanks', {params: params}).then(function(response) {
                    var standardsMap = {},
                        grades = [],
                        data = response.data;

                    angular.forEach(data, function(standard) {
                        if (!angular.isDefined(standardsMap[standard.grade])) {
                            standardsMap[standard.grade] = [];
                        }

                        grades = grades.concat(standard.grade);

                        if (standard.number) {
                            standardsMap[standard.grade] =
                                standardsMap[standard.grade].concat(standard);
                        } else {
                            standardsMap[standard.grade] =
                                standardsMap[standard.grade].concat(standard.children);
                        }
                        svc.processStandards(standard, program.language);

                    });
                    deferred.resolve({
                        map: standardsMap,
                        grades: grades
                    });
                },
                deferred.reject);
                return deferred.promise;
            };

            svc.getSelectedStandard = function(id) {
                var promise = $http({
                    url: PATH.REST + '/standard?path=' + encodeURIComponent(id.replace(/\\/g, '\\')),
                    method: 'GET'
                }).then(function(response) {
                    return response.data;
                });

                return promise;
            };

            svc.getStandardRoute = function(programId, programVersion) {
                return ['/program', programId, programVersion, 'standards'].join('/');
            };

            svc.getSearchRoute = function(standard, programId, programVersion, lastSelectedGrade) {
                var standardId = svc.urlEncode(standard.id);
                lastSelectedGrade = svc.urlEncode(lastSelectedGrade);
                if (!standard.library) {
                    return [
                        '/program', programId, programVersion, 'standards', 'lastSelectedGrade',
                        lastSelectedGrade, 'search', standardId
                    ].join('/');
                }

                var standardLibrary = svc.urlEncode(standard.library);
                return [
                    '/program', programId, programVersion, 'standards', 'lastSelectedGrade',
                    lastSelectedGrade, 'search', standardId, standardLibrary
                ].join('/');
            };

            // make standard segments more url-friendly by replacing
            // special characters before they are url-encoded
            svc.urlEncode = function(standard) {
                if (standard) {
                    standard = standard.replace(/\\/g, '!5C');
                    standard = standard.replace(/\s/g, '!20');
                    standard = standard.replace(/\//g, '!2F');
                }
                return standard;
            };

            svc.urlDecode = function(standard) {
                if (standard) {
                    standard = standard.replace(/!5C/g, '\\');
                    standard = standard.replace(/!20/g, ' ');
                    standard = standard.replace(/!2F/g, '/');
                }
                return standard;
            };

            svc.localeDescription = function(standard, language) {
                if ((language === 'Spanish' || $rootScope.currentUser.getAttribute('profile.locale') === 'es') &&
                    (standard.spanishDescription !== '' && standard.spanishDescription !== null)) {

                    standard.description = standard.spanishDescription;
                }
                return standard;
            };

            svc.getStandardsStateDetails = function(programNames) {
                return $http({
                    method: 'POST',
                    url: PATH.REST + '/standards/libraries/state/info',
                    data: JSON.stringify(programNames),
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }).then(
                function(response) {
                    return _.isEmpty(response.data) ? false : response.data;
                }, function(err) {
                        $log.error('Failed to getStandardsStateDetails', err);
                        return $q.reject(err);
                    });
            };
            return svc;
        }
]);
