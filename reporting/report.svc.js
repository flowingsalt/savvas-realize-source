angular.module('Realize.reporting.ReportService', [
        'RealizeDataServices',
        'Realize.constants.questionType'
    ])
    .factory('ReportService', [
        '$http',
        '$log',
        '$q',
        'REST_PATH',
        'CODE_ASSIGNMENT_HAS_NO_PROGRAM',
        'Assignment',
        'ISODateService',
        'RangeDatepickerOptions',
        'QUESTION_TYPE',
        function($http, $log, $q, REST_PATH, CODE_ASSIGNMENT_HAS_NO_PROGRAM, Assignment, ISODateService,
            RangeDatepickerOptions, QUESTION_TYPE) {
            'use strict';

            var service = {};

            // report list for selected program from report overview
            service.currentProgram = null;
            service.masteryReportList = [];
            service.progressReportList = [];
            service.usageReportList = [];

            // Because IE8 doesn't like our stored format
            service.reformatDate = function(dateString) {
                var parsed = $.fullCalendar.parseISO8601(dateString);
                if (parsed) {
                    return parsed.toString('MM/dd/yyyy');
                } else {
                    return dateString;
                }
            };

            var updateProgramListFromItem = function(item, programList) {
                if (!angular.isArray(item.programs) ||
                        (item.programs.length === 1 && item.programs[0] === CODE_ASSIGNMENT_HAS_NO_PROGRAM)) {
                    item.programs = [];
                } else if (item.programs.length === 1) {
                    programList = programList.concat(item.programs);
                }
                return programList;
            };

            var getClassDataReport = function(url, filterDateStart, filterDateEnd) {
                var promise,
                    params = {};

                if (filterDateStart) {
                    params.dateRangeFrom = ISODateService.toStartOfDayStringWithZone(new Date(filterDateStart));
                }
                if (filterDateEnd) {
                    params.dateRangeTo = ISODateService.toStartOfNextDayStringWithZone(new Date(filterDateEnd));
                }

                promise = $http.get(url, {
                    params: params
                })
                .then(function(response) {
                    var result = [],
                        programList = [];
                    angular.forEach(response.data, function(assignment, key) {
                        var item = angular.extend({}, assignment);
                        programList = updateProgramListFromItem(item, programList);
                        item.assignmentDueDate = service.reformatDate(item.assignmentDueDate);
                        item.index = key;
                        result.push(item);
                    });

                    programList = _.reject(programList, function(n) {return !n;});

                    result = _.sortBy(result, function(d) { return new Date(d.assignmentDueDate);});
                    result.programList = _.uniq(programList);
                    return result;
                });

                return promise;
            };

            service.getScores = function(classId, assignmentId, assessmentId) {
                var url = [
                        REST_PATH, 'mastery', 'class', classId, 'assignment', assignmentId,
                        'assessment', assessmentId, 'scoreSummary'
                    ].join('/');

                return $http.get(url).then(function(response) {
                    var questions = response.data.questions,
                        pafQuestions = _.reject(questions, function(question) {
                            return question.questionType === QUESTION_TYPE.MULTIPLE_CHOICE ||
                                question.questionType === QUESTION_TYPE.GRIDDED_RESPONSE;
                        });
                    response.data.isPAF = pafQuestions.length > 0;
                    return response.data;
                }, function(err) {
                    $log.error('Failed to retrieve score summary', err);
                });
            };

            service.getProgressReport = function(classId, filterDateStart, filterDateEnd) {
                var url = [REST_PATH, '/classes/', classId, '/progress'].join('');

                return getClassDataReport(url, filterDateStart, filterDateEnd).then(function(response) {
                    service.progressReportList = response;
                    return response; //Continue chain
                }, function(e) {
                    $log.error('Failed to retrieve progress report', e);
                });
            };

            service.getMasteryReport = function(classId, filterDateStart, filterDateEnd) {
                var url = [REST_PATH, '/mastery/class/', classId].join('');

                return getClassDataReport(url, filterDateStart, filterDateEnd).then(function(response) {
                    service.masteryReportList = response;
                    return response; //Continue chain
                }, function(e) {
                    $log.error('Failed to retrieve mastery report', e);
                });
            };

            service.getUsageReport = function(classId, filterDateStart, filterDateEnd) {
                var url = [REST_PATH, '/classes/', classId, '/usage'].join('');

                return getClassDataReport(url, filterDateStart, filterDateEnd).then(function(response) {
                    var assignments = angular.copy(response);
                    delete assignments.programList;
                    delete assignments.move;

                    service.usageReportList = assignments;
                    return response; //Continue chain
                }, function(e) {
                    $log.error('Failed to retrieve usage report', e);
                });
            };

            service.getStudentProgress = function(classId, assignmentId) {
                return $http.get([
                        REST_PATH, '/classes/', classId, '/assignments/', assignmentId, '/progress'
                    ].join(''));
            };

            service.averageMastery = function(classId, assignmentId, assessmentId) {
                return $http.get([
                        REST_PATH, '/mastery/standard/class/', classId, '/assignment/', assignmentId,
                        '/assessment/', assessmentId
                    ].join(''));
            };

            service.getStudentUsage = function(classId, assignmentId) {
                return $http.get([
                        REST_PATH, '/classes/', classId, '/assignments/', assignmentId, '/usage'
                    ].join(''));
            };

            service.studentMastery = function(classId, assignmentId, assessmentId) {
                return $http.get([
                        REST_PATH, '/mastery/student/class/', classId, '/assignment/', assignmentId,
                        '/assessment/', assessmentId
                    ].join(''));
            };

            /**
             * Service method to get the data for the Test report under Student Grade page
             */
            service.getStudentTestReport = function(classId, userId, filterDateStart, filterDateEnd) {
                var url = [REST_PATH, '/data/assessments'].join(''),
                    programList = [],
                    params = {
                        'classId': classId,
                        'dateRangeFrom': ISODateService.toStartOfDayStringWithZone(new Date(filterDateStart)),
                        'dateRangeTo': ISODateService.toStartOfNextDayStringWithZone(new Date(filterDateEnd))
                    };
                var promise = $http.get(url, {
                    params: params
                });

                promise.then(function(response) {
                    angular.forEach(response.data, function(item) {
                        programList = updateProgramListFromItem(item, programList);
                        item.assignmentDueDate = service.reformatDate(item.assignmentDueDate);
                    });

                    programList = _.uniq(programList);
                    response.data.programList = _.filter(programList, function(program) { return !!program; });

                    // Not a huge fan, but it does seem to be SOP
                    service.studentTestReportList = response.data;
                }, function(response) {
                    $log.error('getStudentGradeReport: error url = ' + url + ', response = ' + response);
                });

                return promise;
            };

            service.setReportFilters = function(filters) {
                service.reportFilters = filters;
            };

            service.getReportFilters = function() {
                return service.reportFilters;
            };

            service.resetReportFilters = function() {
                service.reportFilters = undefined;
            };

            service.getStudentProgressByClass = function(assignmentProgressDataByProgram) {
                var progressByClass = {
                    'assignmentsCompletedOnTime': 0,
                    'assignmentsCompletedPastDue': 0,
                    'assignmentsInProgress': 0,
                    'assignmentsNotStarted': 0
                };

                angular.forEach(assignmentProgressDataByProgram, function(data) {
                    if (data.status === 'NOT_STARTED') {
                        ++progressByClass.assignmentsNotStarted;
                    } else if (data.status === 'IN_PROGRESS') {
                        ++progressByClass.assignmentsInProgress;
                    } else if (data.status === 'COMPLETED') {
                        ++progressByClass.assignmentsCompletedOnTime;
                    } else if (data.status === 'COMPLETED_PAST_DUE') {
                        ++progressByClass.assignmentsCompletedPastDue;
                    }
                });

                return progressByClass;
            };

            /**
             * Service method to get Progress report for student
             */
            service.getStudentProgressReportForStudent = function(classId, filterDateStart, filterDateEnd) {
                var url = [REST_PATH, '/classes/' + classId + '/reports/assignmentprogress'].join(''),
                    params = {
                        'dateRangeFrom': ISODateService.toStartOfDayStringWithZone(new Date(filterDateStart)),
                        'dateRangeTo': ISODateService.toStartOfNextDayStringWithZone(new Date(filterDateEnd))
                    };

                var promise = $http.get(url, {
                    params: params
                });

                promise.then(function(response) {
                    var data = response.data,
                        programFilterIndex,
                        programList = [];

                    angular.forEach(response.data, function(item) {
                        programList = updateProgramListFromItem(item, programList);
                    });
                    programFilterIndex = _.indexOf(programList, service.reportFilters.program);
                    if (programFilterIndex !== -1) {
                        var selectedProgram = service.reportFilters.program;
                        data = [];
                        angular.forEach(response.data, function(item) {
                            if (item.programs.length === 1 &&
                                    selectedProgram === item.programs[0]) {
                                data.push(item);
                            }
                        });
                    }

                    service.studentProgressRecapCounts = service.getStudentProgressByClass(data);
                    response.data = {};
                    response.data.studentProgress = service.studentProgressRecapCounts;
                    response.data.programFilterIndex = programFilterIndex;
                    response.data.programList = programList;
                }, function(response) {
                    $log.error('getStudentProgressReport: error url = ' + url + ', response = ' + response);
                });
                return promise;
            };

            service.getStudentProgressRecap = function(classId, filterDateStart, filterDateEnd, program, status) {
                var errorHandler,
                    successHandler,
                    url = [REST_PATH, 'classes', classId, 'reports/studentprogress', status].join('/'),
                    params = {
                        'dateRangeFrom': ISODateService.toStartOfDayStringWithZone(new Date(filterDateStart)),
                        'dateRangeTo': ISODateService.toStartOfNextDayStringWithZone(new Date(filterDateEnd))
                    };

                if (program) {
                    params.program = program;
                }

                successHandler = function(data) {
                    var objs = [];
                    angular.forEach(data.data, function(assign) {
                        objs.push(new Assignment(assign));
                    });

                    return objs;
                };

                errorHandler = function(data) {
                    return $q.defer().reject(data);
                };

                return $http.get(url, {
                    params: params
                }).then(successHandler, errorHandler);
            };

            var rangeDatepickerOptions = new RangeDatepickerOptions('#filterDateStart', '#filterDateEnd');
            service.startDateOptions = rangeDatepickerOptions.start;
            service.dueDateOptions = rangeDatepickerOptions.end;

            // CONSTANTS
            service.CONSTANTS = {
                RECAP: {
                    ELLIPSES_NAME: 25
                }
            };

            return service;
        }
    ]);
