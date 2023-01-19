angular.module('RealizeApp')
    .controller('StudentHomeCtrl', [
        '$scope',
        '$log',
        'SHARED_THUMBNAIL_PATH',
        '$location',
        '$q',
        'ClassRoster',
        'AssignmentFacadeService',
        'DISTANT_FUTURE_DATE',
        'ProgramService',
        'BrowserInfo',
        'browseLinkTelemetryService',
        function($scope, $log, SHARED_THUMBNAIL_PATH, $location, $q, ClassRoster, AssignmentFacadeService,
                 DISTANT_FUTURE_DATE, ProgramService, BrowserInfo, browseLinkTelemetryService) {
            'use strict';

            $scope.background = SHARED_THUMBNAIL_PATH + '/homepage/' +
                ($scope.currentUser.getAttribute('home.background') || 'teacher6') +
                (BrowserInfo.isHDDisplay ? '@2x.jpg' : '.jpg');

            $scope.DISTANT_FUTURE_DATE = DISTANT_FUTURE_DATE;

            $scope.totalPrograms = 0;
            $scope.rosters = [];
            $scope.programs = [];
            $scope.rosterAssignments = 0;

            var getRostersWithAssignments = function() {
                var finalRosters = [],
                    done = AssignmentFacadeService.getClassesReportingData();

                done.then(function(response) {
                    var rosters, results;

                    // merge in all the assignments
                    rosters = response;
                    $.Enumerable.From(rosters).OrderBy('$.reportingData.nextAssignmentDueDate').ForEach(
                        function(roster) {
                            if (roster.reportingData.nextAssignmentDueDate) {
                                $scope.rosterAssignments++;
                                roster.minAssignment = roster.reportingData.nextAssignmentDueDate;
                            } else {
                                roster.minAssignment = DISTANT_FUTURE_DATE;
                            }
                            roster.numCompletedAssignments = roster.reportingData.assignmentCompletionCount;
                        }
                    );
                    results = rosters;
                    // order them by assignment due date
                    results = $.Enumerable.From(results).OrderBy('$.minAssignment').ToArray();
                    angular.copy(results, finalRosters);
                });
                return finalRosters;
            };

            $scope.rosters = getRostersWithAssignments();

            $scope.numClasses = ' ';
            $scope.$watch('rosters.length', function(length) {
                $scope.numClasses = length > 1 ? (' ' + length + ' ') : ' ';

                $scope.gradedRosters = $.Enumerable.From($scope.rosters)
                    .Where(function(roster) {
                        return roster.numCompletedAssignments > 0;
                    })
                    .OrderByDescending('$.numCompletedAssignments')
                    .ToArray();
            });

            ProgramService.getAllPrograms().then(function(response) {
                $scope.programs = _.first(response.results, 2);
                $scope.totalPrograms = response.totalMatches;
            });

            $scope.thumbnailStyle = function(program) {
                return {'visibility': program.thumbnailLocation === '' ? 'hidden' : 'visible'};
            };

            // open a program
            $scope.open = function(e, program) {
                e.preventDefault();
                e.stopPropagation();

                // adjust reference if customized program is used
                program = program.$getDefaultVersion();

                $location.path('/program/' + program.id + '/' + program.version);
            };

            $scope.viewGrades = function(e, roster) {
                e.preventDefault();
                e.stopPropagation();
                $location.path('/grades/' + roster.classId + '/overview');
            };

            $scope.step1More = function(e, location) {
                e.preventDefault();
                e.stopPropagation();

                if (location) {
                    browseLinkTelemetryService.sendTelemetryEvents(location);
                }

                // one program, go directly to it
                if ($scope.programs.length === 1) {
                    $location.path('/program/' + $scope.programs[0].id + '/' + $scope.programs[0].version);
                } else {
                    // goto whole list
                    $location.path('/program');
                }
            };

            $scope.step2More = function(e, location) {
                e.preventDefault();
                e.stopPropagation();

                if (location) {
                    browseLinkTelemetryService.sendTelemetryEvents(location);
                }

                $location.path('/classes');
            };

            $scope.openRoster = function(e, roster) {
                e.preventDefault();
                e.stopPropagation();

                $location.path('/classes/' + roster.classId + '/assignments');
            };

            $scope.step3More = function(e) {
                e.preventDefault();
                e.stopPropagation();

                $location.path('/grades');
            };
        }
    ]);
