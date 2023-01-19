angular.module('RealizeApp')
    .controller('CentersSubNavCtrl', [
        '$scope',
        '$rootScope',
        '$location',
        '$log',
        'SHARED_THUMBNAIL_PATH',
        'Resolve',
        'BrowserInfo',
        'MediaQuery',
        function($scope, $rootScope, $location, $log, SHARED_THUMBNAIL_PATH, Resolve, BrowserInfo, MediaQuery) {
            'use strict';

            $scope.programs = [];

            $scope.shortenLabels = !MediaQuery.breakpoint.isDesktop;

            Resolve.CentersProgramListInfo().then(function(programsInfo) {
                $scope.programs = programsInfo.programs;
            });

            //TODO: this code is also in ProgramSubNavCtrl
            $rootScope.$watch('currentProgram', function(program) {
                if (!(program && $scope.programs)) {
                    return;
                }
                $scope.currentProgram = program;
                $scope.ddList = $.Enumerable.From($scope.programs)
                    .Where('$.id != \'' + $scope.currentProgram.id + '\'').ToArray();
            }, true);

            //TODO: this code is also in ProgramSubNavCtrl
            $scope.$watch('programs', function(programs) {
                if (!(programs && $rootScope.currentProgram)) {
                    return;
                }
                $scope.currentProgram = $rootScope.currentProgram;
                $scope.ddList = $.Enumerable.From($scope.programs)
                    .Where('$.id != \'' + $scope.currentProgram.id + '\'').ToArray();
            }, true);

            $scope.sortBy = $scope.currentUser.getAttribute('programs.defaultSort') || '+gradeNumbers[0]';

            // TODO: this code is also in ProgramSubNavCtrl
            $scope.programThumb = function(program) {
                if (!program.thumbnailLocation || program.thumbnailLocation === '') {
                    return '';
                }

                var fileExtension = '.png';
                if (BrowserInfo.isHDDisplay) {
                    fileExtension = '@2x' + fileExtension;
                }
                return SHARED_THUMBNAIL_PATH + '/' + program.thumbnailLocation + '_course' + fileExtension;
            };

            $scope.open = function(program) {
                // adjust reference if customized item is used
                program = program.$getDefaultVersion();

                if (program.id !== 'blank' &&  program.centersProperties &&  program.centersProperties.itemUuid) {
                    var path = $location.path();
                    // if inside a tier, remove tier from path prior to navigating
                    if (path.search('/tier/') >= 0) {
                        path = path.split('/tier/')[0];
                    }

                    // if inside tier2, remove tier2 from path prior to navigating
                    if (path.search('/tier2/') >= 0) {
                        path = path.split('/tier2/')[0];
                    }

                    // if inside center, remove center from path prior to navigating
                    if (path.search('/center/') >= 0) {
                        path = path.split('/center/')[0];
                    }

                    path = path.replace($scope.currentProgram.id + '/' + $scope.currentProgram.version,
                        program.id + '/' + program.version);
                    path = path.replace($scope.currentProgram.centersProperties.itemUuid,
                        program.centersProperties.itemUuid);

                    $location.path(path);
                } else {
                    $log.log('invalid new path');
                }
            };

            $scope.$on('window.breakpoint.change', function breakpointChanged() {
                $scope.$apply(function() {
                    $scope.shortenLabels = !MediaQuery.breakpoint.isDesktop;
                });
            });
        }
    ]);
