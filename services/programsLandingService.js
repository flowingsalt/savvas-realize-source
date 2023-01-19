angular.module('RealizeApp')
    .service('ProgramsLandingService', [
        '$log',
        '$q',
        '$rootScope',
        'ProgramService',
        function($log, $q, $rootScope, ProgramService) {
            'use strict';

            var programListResolve = function(favoritesAttribute, programListQuery) {
                var deferredProgramListInfo = $q.defer(),
                favorites = $rootScope.currentUser.getAttribute(favoritesAttribute) || [];

                programListQuery.then(function(response) {
                    $log.log('ProgramsList success handler', arguments);

                    var progs = response.results,
                    i,
                    numProgs = progs.length,
                    favs = $.Enumerable.From(favorites);

                    for (i = 0; i < numProgs; i++) {
                        // create the isFavorite values for sorting programs
                        // using blank rather than false due to angular sorting true/false as 1/0
                        progs[i].isFavorite = (favs.IndexOf(progs[i].id) >= 0) ? true : '';

                        // convert grade numbers to int and K to 0 for sorting programs
                        if (progs[i].gradeNumbers) {
                            progs[i].gradeNumbers[0] = (progs[i].gradeNumbers[0] === 'K') ?
                                0 : parseInt(progs[i].gradeNumbers[0], 10);

                            // Move all invalid grade to the back of the list
                            if (isNaN(progs[i].gradeNumbers[0])) {
                                progs[i].gradeNumbers[0] = 99;
                            }
                        } else {
                            // Grade not defined. Move to back of the list.
                            progs[i].gradeNumbers = [99];
                        }
                    }

                    deferredProgramListInfo.resolve({
                        programs: progs,
                        totalMatches: response.totalMatches
                    });
                });

                return deferredProgramListInfo.promise;
            };

            this.getProgramListInfo = function(inCentersTab) {
                return inCentersTab ?
                    programListResolve('programsWithCenters.favorites', ProgramService.getAllCenters()) :
                    programListResolve('programs.favorites', ProgramService.getAllPrograms());
            };
            this.getEssayPromptAccess = function(contentItems) {
                return ProgramService.getEssayPromptAccess(contentItems);
            };
        }
    ]);
