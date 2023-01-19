angular.module('RealizeApp')
.controller('TeacherHomeProgramsCtrl', [
    '$scope',
    'Content',
    '$location',
    '$log',
    'SHARED_THUMBNAIL_PATH',
    'ProgramService',
    'HOME_STATES',
    'BrowserInfo',
    'browseLinkTelemetryService',
    function($scope, Content, $location, $log, SHARED_THUMBNAIL_PATH, ProgramService,
        STATE, BrowserInfo, browseLinkTelemetryService) {
        'use strict';

        $scope.phase.programs.content = STATE.loading;
        $scope.totalPrograms = 0;
        $scope.programs = [];

        ProgramService.getAllPrograms().then(function(response) {
            $scope.programs = response.results;
            $scope.totalPrograms = response.totalMatches;
            $scope.phase.programs.content = STATE.loading;
            if ($scope.totalPrograms === 1) {
                $scope.phase.programs.quickLink = STATE.oneProgram;
                $scope.phase.programs.content = STATE.complete;
            } else if ($scope.totalPrograms > 1) {
                $scope.phase.programs.quickLink = STATE.manyPrograms;
                $scope.phase.programs.content = STATE.complete;
            } else {
                $scope.phase.programs.quickLink = STATE.noProgram;
                $scope.phase.programs.content = STATE.noProgram;
            }
            $scope.phase.programs.loaded = true;
            if ($scope.firstVisit) {
                $scope.phase.programs.content = STATE.firstVisit;
            }
        });

        if ($scope.firstVisit) {
            $scope.phase.programs.header = STATE.firstVisit;
        } else if ($scope.programsVisited && !$scope.assignmentsCreated) {
            if ($scope.totalPrograms > 0) {
                $scope.phase.programs.header = STATE.inProgress;
            } else {
                $scope.phase.programs.header = STATE.noProgram;
            }
        } else if ($scope.assignmentsCreated) {
            $scope.phase.programs.header = STATE.complete;
        }

        $scope.programThumb = function(program) {
            if (program.thumbnailLocation === '') {
                return '';
            }

            var fileExtension = '.png';
            if (BrowserInfo.isHDDisplay) {
                fileExtension = '@2x' + fileExtension;
            }
            if ($scope.programs.length === 1 && !$scope.firstVisit) {
                return SHARED_THUMBNAIL_PATH + '/' + program.thumbnailLocation + '_homelarge' + fileExtension;
            } else {
                return SHARED_THUMBNAIL_PATH + '/' + program.thumbnailLocation + '_homesmall' + fileExtension;
            }
        };

        $scope.more = function(e, location) {
            e.preventDefault();
            e.stopPropagation();

            if (location) {
                browseLinkTelemetryService.sendTelemetryEvents(location);
            }

            if ($scope.isNbcLearnUser() && _.without($scope.currentUser.subscribedCourses, 'public').length === 1) {
                // should only happen when only subscribed to NBC Learn while ignoring if it has 'public' or not
                $location.path('/nbclearn/browse');
            } else {
                // one program, go directly to it
                if ($scope.programs.length === 1) {
                    $location.path('/program/' + $scope.programs[0].id + '/' + $scope.programs[0].version);
                } else {
                    // goto whole list
                    $location.path('/program');
                }
            }
        };

        // open a program
        $scope.open = function(e, program) {
            e.preventDefault();
            e.stopPropagation();

            // adjust reference if customized program is used
            program = program.$getDefaultVersion();

            if (program.externalSource === 'NBC Learn') {
                $location.path('/nbclearn/browse');
            } else {
                $location.path('/program/' + program.id + '/' + program.version);
            }
        };
    }
]);
