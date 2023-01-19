angular.module('Realize.reporting.grades.GradesOverviewCtrl', [
        'RealizeDataServices',
        'Realize.analytics',
        'Realize.reporting.ReportService',
        'Realize.content.constants'
    ])
    .controller('GradesOverviewCtrl', [
        '$q',
        '$scope',
        'RosterData',
        '$log',
        '$location',
        'CountClasses',
        'ReportService',
        'lwcI18nFilter',
        'CODE_ASSIGNMENT_HAS_NO_PROGRAM',
        '$timeout',
        'Analytics',
        'CONTENT_CONSTANTS',
        'featureManagementService',
        function($q, $scope, RosterData, $log, $location, CountClasses, ReportService, lwcI18nFilter,
            CODE_ASSIGNMENT_HAS_NO_PROGRAM, $timeout, Analytics, CONTENT_CONSTANTS, featureManagementService) {
            'use strict';

            $scope.currentRoster = RosterData;
            $scope.classesCount = CountClasses;

            $scope.startDateOptions = ReportService.startDateOptions;
            $scope.dueDateOptions = ReportService.dueDateOptions;

            $scope.isAssessmentMaintenancePageEnabled = featureManagementService.isAssessmentMaintenancePageEnabled();

            if ($scope.isAssessmentMaintenancePageEnabled) {
                $scope.pageLoaded();
                return;
            }

            $scope.$watch('filters.endDate', function(newDate) {
                $scope.startDateOptions.maxDate = new Date(newDate);
            });

            $scope.$watch('filters.startDate', function(newDate) {
                $scope.dueDateOptions.minDate = new Date(newDate);
            });

            //filters
            var filters = {};

            $scope.noAssignmentInSelectedClass = function() {
                return (angular.isString ($scope.zeroStateCode) &&
                    $scope.zeroStateCode === 'noAssignmentsInSelectedClass');
            };

            $scope.noAssessmentInSelectedClass = function() {
                return (angular.isString ($scope.zeroStateCode) &&
                    $scope.zeroStateCode === 'noCompletedAssessmentsInSelectedClass');
            };

            $scope.gotoPrograms = function() {
                $location.path('/program');
            };

            if (ReportService.getReportFilters()) {
                $scope.filters = ReportService.getReportFilters();
            } else {
                $scope.filters = {
                    startDate: Date.today().addMonths(-1).toString('MM/dd/yyyy'),
                    endDate: Date.today().toString('MM/dd/yyyy'),
                    program: null
                };
            }

            // data containers
            $scope.reportData = {
                studentAssessment: null,
                studentProgress: null
            };

            $scope.zeroStateCode = null;

            angular.element('#filterDateStart').focus(function() {
                $(this).attr('aria-expanded', true);
            }).focusout(function() {
                $(this).attr('aria-expanded', false);
            });

            angular.element('#filterDateEnd').focus(function() {
                $(this).attr('aria-expanded', true);
            }).focusout(function() {
                $(this).attr('aria-expanded', false);
            });

            var getTestReport = function() {
                return ReportService.getStudentTestReport(
                    $scope.currentRoster.classId,
                    $scope.currentUser.userId,
                    $scope.filters.startDate,
                    $scope.filters.endDate
                ).then(function(response) {
                    // test report section
                    var assessmentList = response.data;

                    if (angular.isArray(assessmentList.programList)) {
                        if (!angular.isArray($scope.programList)) {
                            $scope.programList = assessmentList.programList;
                        }
                        var programFilterIndex = _.indexOf($scope.programList, $scope.filters.program),
                            nonAdaptiveAssessmentList = [];
                        angular.forEach(assessmentList, function(assessment) {
                            if (assessment.assignmentType !== CONTENT_CONSTANTS.MEDIA_TYPE.ADAPTIVE) {
                                nonAdaptiveAssessmentList.push(assessment);
                            }
                        });
                        if (programFilterIndex === -1) { //Default filter: All Programs
                            $scope.reportData.studentAssessment = nonAdaptiveAssessmentList;
                        } else {
                            $scope.reportData.studentAssessment = _.filter(nonAdaptiveAssessmentList,
                                function(assessment) {
                                    return assessment.programs.length === 1 &&
                                        assessment.programs[0] === $scope.filters.program;
                                });
                        }
                    } else {
                        $scope.reportData.studentAssessment = [];
                    }
                    $log.log('grade test report data set ' + $scope.reportData.studentAssessment);
                }, function(err) {
                    $scope.reportData.studentAssessment = [];
                    return err; //Propagate error since no assignments returns 404
                });
            };

            var getProgressReport = function() {
                return ReportService.getStudentProgressReportForStudent(
                    $scope.currentRoster.classId,
                    $scope.filters.startDate,
                    $scope.filters.endDate
                ).then(function(response) {
                    $scope.programList = response.data.programList;
                    $scope.progIndex = response.data.programFilterIndex;
                    $scope.reportData.studentProgress = response.data.studentProgress;
                    $log.log('grade progress report data set ' + $scope.reportData.studentProgress);
                }, function(err) {
                    $scope.reportData.studentProgress = [];
                    return err; //Propagate error since no assignments returns 404
                });
            };

            var loadPageNow = function() {
                $timeout(function() {
                    $scope.pageLoaded();
                }, 500);
            };

            // on filter change, update the graphs
            var filterUpdated = function() {
                if (!angular.equals($scope.filters, filters)) {
                    $scope.pageLoading();
                    angular.copy($scope.filters, filters);
                    $scope.zeroStateCode = null;
                    ReportService.setReportFilters($scope.filters);
                    var testAndProgressReportsRetrieved = $q.all({
                        test: getTestReport(),
                        progress: getProgressReport()
                    });
                    testAndProgressReportsRetrieved.then(function(result) {
                        if (result.progress && result.progress.status !== 200) {
                            $scope.zeroStateCode = result.progress.data.errorCode;
                        }
                        loadPageNow();
                    }, function(result) {
                        $log.error('failed to extract progress and test report ');
                        if (angular.isDefined(result.status)) {
                            $scope.zeroStateCode = result.data.errorCode;
                            $log.error('zeroStateCode: ', $scope.zeroStateCode);
                        } else {
                            $log.error('progress report error code not found...');
                        }
                        loadPageNow();
                    });
                }
            };

            // update graph when date range changes
            $scope.$watch('filters.startDate + filters.endDate', function(newDate, oldDate) {
                if (newDate !== oldDate) {
                    $log.log('Date filter watch', newDate, oldDate);
                    Analytics.track('track.action', {category: 'Grades', action: 'Change Calendar Range'});
                    filterUpdated();
                }
            });

            // update graph when class selection changesS
            $scope.$watch('filters.program', function(newProgram, oldProgram) {
                $log.log('filter program watch', newProgram, oldProgram);
                ReportService.currentProgram = newProgram;
                filterUpdated();
            });

            $scope.getCurrentProgramName = function() {
                if (angular.isArray($scope.programList)) {
                    if ($scope.progIndex === -1) {
                        // show text for "All Programs" in the program list drop-down
                        return lwcI18nFilter('grades.overview.filter.options.allPrograms');
                    }
                    var selectedProgram = $scope.programList[$scope.progIndex];

                    return selectedProgram;
                }
                return '';
            };

            $scope.getProgramName = function(programName) {
                if (programName === CODE_ASSIGNMENT_HAS_NO_PROGRAM) {
                    return lwcI18nFilter('grades.overview.filter.options.emptyProgramName');
                }
                return programName;
            };

            $scope.$on('a11yDateRange.date.selected', function(e, dateRange) {
                $scope.filters = dateRange;
                filterUpdated();
            });

            $scope.back = function() {
                var backURL;
                var isDashboardEnabled = featureManagementService.isShowDashboardAppEnabled();
                if (isDashboardEnabled) {
                    backURL = '/dashboard';
                } else {
                    backURL = '/';
                }
                var next = $scope.classesCount < 2 ? backURL : '/grades';
                $scope.goBack(next, true);
            };
        }
    ]);
