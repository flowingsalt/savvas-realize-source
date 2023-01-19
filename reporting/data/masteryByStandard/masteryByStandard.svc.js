angular.module('Realize.reporting.MasteryByStandardReport', [
    'Realize.paths',
    'Realize.user.currentUser',
    'Realize.assignment.facadeService',
    'Realize.standard.constants',
    'webStorageModule'
])
    .service('MasteryByStandardReport', [
        '$http',
        '$log',
        '$q',
        '$filter',
        'REST_PATH',
        'MASTERY_THRESHOLD',
        'User',
        '$window',
        'RealizeHelpers',
        'AssignmentFacadeService',
        'STANDARD_CONSTANTS',
        'webStorage',
        function($http, $log, $q, $filter, REST_PATH, MASTERY_THRESHOLD, User, $window, $helpers,
                AssignmentFacadeService, STANDARD_CONSTANTS, webStorage) {
            'use strict';

            var service = {},
                savedClassId,
                savedStandardPageNumber,
                savedFiltersAttributeKey = 'masteryStandardFilters',
                standardMasteryByClass = 'standardMasteryByClass';

            service.getReport = function(classId, params, userId) {
                var url = [REST_PATH, '/classes/', classId, '/mastery/standards'].join(''),
                    query;

                query = params || {};
                var paramChange;
                if (!params.isAllAssignment) {
                    paramChange =  _.pick(query, ['programName', 'standardsLibraryFullPath', 'assignmentIds']);
                } else if (!params.isAllContentCategory) {
                    paramChange = _.pick(query, ['programName', 'standardsLibraryFullPath', 'contentCategory']);
                } else {
                    paramChange =  _.pick(query, ['programName', 'standardsLibraryFullPath']);
                }

                return $http.get(url, {
                    params: paramChange
                }).then(function(response) {
                    var data = response.data;

                    data.statusCode = response.status;

                    getStudentInfo(data);

                    return data;
                }, function(error) {
                    if (error.data.errorMessage === STANDARD_CONSTANTS.STANDARD_ERROR_MESSAGE) {
                        var storedDefaultPreference = webStorage.get(STANDARD_CONSTANTS.STANDARD_MASTERY_BY_CLASS +
                            '.' + userId + '.' + classId);
                        AssignmentFacadeService.resetlocalStorageData(storedDefaultPreference, userId, classId);
                        return $http.get(url, {
                            params: _.pick(query, ['programName', 'standardsLibraryFullPath'])
                        }).then(function(response) {
                            var data = response.data;
                            data.statusCode = response.status;
                            getStudentInfo(data);
                            return data;
                        });
                    } else {
                        throw error;
                    }
                });
            };

            var getStudentInfo = function(data) {
                var ellipsesLimitName = service.ELLIPSES_NAME;
                if (data && data.studentInfoList) {
                    _.each(data.studentInfoList, function(student) {
                        student.lastFirst =
                            student.lastName + (student.firstName ? ', ' + student.firstName : '');
                        student.ellipsesName =  $filter('ellipses')(student.lastFirst, ellipsesLimitName);
                    });
                }
            };

            service.getIndividualStudentReport = function(classId, studentId, params) {
                var url = [REST_PATH, '/classes/', classId, '/mastery/standards/students/', studentId].join(''),
                    query = params || {},
                    result = {},
                    currentStudent = {};

                return $http.get(url, {
                    params: _.pick(query, ['programName', 'standardsLibraryFullPath'])
                })
                .then(function(response) {
                    result = response.data;
                    currentStudent = _.findWhere(result.studentInfoList, {
                        'studentId': studentId
                    });

                    if (currentStudent) {
                        result.hasStudentRecord = true;
                        var studentStandard = currentStudent.standardInfoMapByStandardId;

                        _.each(result.standardInfoMapByStandardId, function(standard) {
                            var studentRecord = studentStandard[standard.standardId];
                            if (studentRecord) {
                                studentRecord.isTested = true;
                                studentRecord.percentAsDecimal =
                                    studentRecord.pointsAchieved / studentRecord.pointsPossible;
                                studentRecord.isStandardMastered = studentRecord.percentAsDecimal >= MASTERY_THRESHOLD;
                                studentRecord.studentSubmittedDate =
                                    moment(studentRecord.lastTestedDate).format('MM/DD/YY');
                                standard.studentRecord = studentRecord;
                            } else {
                                standard.studentRecord = {
                                    isTested: false
                                };
                            }
                        });
                    } else {
                        result.hasStudentRecord = false;
                    }
                    return result;
                }, function(err) {
                    if (err.status === 404) {
                        result.hasStudentRecord = false;
                        return result;
                    }
                    $log.error('error getting student report', err);
                    return $q.reject('error getting student report', err);
                });
            };

            service.getReportPage = function(pageNumber, pageSize, list) {
                var startIndex = (pageNumber - 1) * pageSize,
                    endIndex = startIndex + pageSize,
                    page;

                if (endIndex > list.length) {
                    endIndex = list.length;
                }

                page = list.slice(startIndex, endIndex);

                return {
                    startIndex: startIndex,
                    endIndex: endIndex,
                    total: list.length,
                    totalPages: Math.ceil(list.length / pageSize),
                    pageNumber: pageNumber,
                    pageSize: pageSize,
                    list: page
                };
            };

            service.saveFilterOptions = function(currentUser, classId, filters) {
                var savedFilters = currentUser.getAttribute(savedFiltersAttributeKey) || {};
                savedFilters[classId] = filters;
                currentUser.setAttribute(savedFiltersAttributeKey, savedFilters);
            };

            service.getSavedFilterOptions = function(currentUser, classId) {
                var savedFilters = {};
                var savedLocalPreference = webStorage.get(standardMasteryByClass +
                    '.' + currentUser.userId + '.' + classId) || {};
                if (!savedLocalPreference.programName) {
                    var currentUserSavedFilters = currentUser.getAttribute(savedFiltersAttributeKey);
                    if (currentUserSavedFilters) {
                        savedFilters = currentUserSavedFilters[classId] || {};
                    }
                } else {
                    savedFilters.programName = savedLocalPreference.programName;
                    savedFilters.standardsLibraryFullPath = savedLocalPreference.standardsLibraryFullPath;
                    savedFilters.standards = savedLocalPreference.standards;
                    savedFilters.contentCategory = savedLocalPreference.contentCategory;
                    savedFilters.assignmentId = savedLocalPreference.assignmentId;
                    savedFilters.assignmentTitle = savedLocalPreference.assignmentTitle;
                    savedFilters.isAllStandards = savedLocalPreference.isAllStandards;
                    savedFilters.isAllContentCategory = savedLocalPreference.isAllContentCategory;
                    savedFilters.isAllAssignment = savedLocalPreference.isAllAssignment;
                    this.saveAssignmentIds(savedFilters, savedLocalPreference);
                }
                return savedFilters;
            };
            service.saveAssignmentIds = function(savedFilters, savedLocalPreference) {
                if (angular.isDefined(savedLocalPreference.assignmentIds) &&
                    savedLocalPreference.assignmentIds.length > 0) {
                    savedFilters.assignmentIds = Object.values(savedLocalPreference.assignmentIds).join(',');
                }
            };

            service.saveStandardPageNumber = function(classId, pageNumber) {
                savedStandardPageNumber = pageNumber;
                savedClassId = classId;
            };

            service.getSavedStandardPageNumber = function(classId) {
                if (savedClassId === classId) {
                    return savedStandardPageNumber;
                } else {
                    this.saveStandardPageNumber(classId, 1);
                    return 1;
                }
            };

            //Workaround for student with data but removed from class
            service.mockStudentUserFromReportData = function(student, classId) {
                var mockStudent = angular.extend({}, student);

                mockStudent.firstAndLast = mockStudent.firstName + ' ' + mockStudent.lastName;
                mockStudent.lastFirst = mockStudent.lastName + ', ' + mockStudent.firstName;
                mockStudent.userId = mockStudent.studentId;
                mockStudent.removed = true;
                service.removedStudent = mockStudent;
                service.removedStudentClassId = classId;
                return mockStudent;
            };

            service.getRemovedStudent = function(classId) {
                if (classId !== service.removedStudentClassId) {
                    delete service.removedStudentClassId;
                    delete service.removedStudent;
                }

                return service.removedStudent;
            };

            service.exportClassReport = function(classId, params) {
                return service.export(classId, 'mastery/standards/export', params);
            };

            service.exportIndividualReport = function(classId, studentId, params) {
                var path = ['mastery/standards/students/', studentId, '/export'].join('');
                return service.export(classId, path, params);
            };

            service.export = function(classId, path, params) {
                var url = [REST_PATH, 'classes', classId, path].join('/');

                url = $helpers.buildUrl(url, params);

                //workaround test for session out - Fix Later
                User.getCurrentUser().then(function() {
                    $window.open(url, '_blank');
                });
            };

            service.sortStandardInfoMapByPercentageOrder = function(infoMap, descendingOrder) {
                var partialSortedList = _.chain(infoMap)
                    .toArray()
                    .sortBy(function(standard) {
                        return standard.displayOrder;
                    })
                    .sortBy(function(standard) {
                        return standard.percentageOfStudentsMastered;
                    })
                    .value();
                if (descendingOrder) {
                    partialSortedList.reverse();
                }
                return _.chain(partialSortedList)
                    .toArray()
                    .sortBy(function(standard) {
                        return !standard.assessed;
                    }).value();
            };

            service.nameComparator = function(student1, student2) {
                var comparedResult;
                comparedResult = $filter('lowercase')(student1.lastFirst) < $filter('lowercase')(student2.lastFirst) ?
                    -1 : 1;
                return comparedResult;
            };

            service.percentComparator = function(student1, student2, isAscending) {
                var comparedResult;
                if (student1.percentageMasteredForStandardsLibrary ===
                    student2.percentageMasteredForStandardsLibrary && isAscending) {
                    comparedResult = $filter('lowercase')(student1.lastFirst) <
                        $filter('lowercase')(student2.lastFirst) ? -1 : 1;
                } else if (student1.percentageMasteredForStandardsLibrary ===
                        student2.percentageMasteredForStandardsLibrary && !isAscending) {
                    comparedResult = $filter('lowercase')(student1.lastFirst) >
                        $filter('lowercase')(student2.lastFirst) ? -1 : 1;
                } else {
                    comparedResult = student1.percentageMasteredForStandardsLibrary <
                        student2.percentageMasteredForStandardsLibrary ? -1 : 1;
                }
                return comparedResult;
            };

            service.standardComparator = function(student1, student2, standardId) {
                if (!service.hasRequiredDataToSort(student1) ||
                    !service.hasRequiredDataToSort(student2)) {
                    return 0;
                }

                var student1PointsInfo = student1.standardInfoMapByStandardId[standardId];
                var student2PointsInfo = student2.standardInfoMapByStandardId[standardId];

                // Number.NEGATIVE_INFINITY implies there is a dash in the standard score
                var student1PointsOutOfPossible = student1PointsInfo !== undefined ?
                    student1PointsInfo.pointsAchieved / student1PointsInfo.pointsPossible : Number.NEGATIVE_INFINITY;

                var student2PointsOutOfPossible = student2PointsInfo !== undefined ?
                    student2PointsInfo.pointsAchieved / student2PointsInfo.pointsPossible : Number.NEGATIVE_INFINITY;

                return student1PointsOutOfPossible < student2PointsOutOfPossible ? -1 : 1;
            };

            service.hasRequiredDataToSort = function(studentDetails) {
                var isInvalidData = !studentDetails || !studentDetails.standardInfoMapByStandardId;
                // Returning not of invalid data because the above conditions are not met, the data is valid
                return !isInvalidData;
            };

            // CONSTANTS
            service.ELLIPSES_NAME = 18;

            return service;
        }
    ]);
