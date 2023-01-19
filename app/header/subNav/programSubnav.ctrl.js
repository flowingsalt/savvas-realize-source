angular.module('RealizeApp')
    .controller('ProgramSubNavCtrl', [
        '$scope',
        '$rootScope',
        '$location',
        '$log',
        'Resolve',
        '$route',
        'ProgramService',
        'Modal',
        'MediaQuery',
        'ContentSource',
        'browseAllEventTracking',
        'browseAllService',
        'ContentViewer',
        function($scope, $rootScope, $location, $log, Resolve, $route, ProgramService, Modal, MediaQuery,
            ContentSource, browseAllEventTracking, browseAllService, ContentViewer) {
            'use strict';

            $rootScope.subNavLoading = true;
            $scope.programs = [];
            $scope.shortenLabels = !MediaQuery.breakpoint.isDesktop;

            $scope.sortBy = $rootScope.currentUser.getAttribute('programs.defaultSort') || '+gradeNumbers[0]';

            Resolve.ProgramListInfo().then(function(programsInfo) {
                // todo: somehow apply this @ service level?
                var favorites = $rootScope.currentUser.getAttribute('programs.favorites') || [],
                    programs = programsInfo.programs;

                // apply favorite
                _.each(programs, function(p) {
                    // opposite for sorting purposes
                    p.isFavorite = !_.contains(favorites, p.id);
                });

                $scope.programs = programs;

                $scope.$route = $route;

                if (!$rootScope.currentProgram) {
                    $rootScope.currentProgram = _.findWhere($scope.programs, {
                        'id': $route.current.params.programId
                    });
                }

                $rootScope.subNavLoading = false;

            }, function(err) {
                $log.error('error getting programs for subnav!', err);
            });

            // filter for the dropdown
            $scope.withoutCurrent = function(item) {
                //$log.log('withoutCurrent', item, $route);
                return item.id !== $route.current.params.programId;
            };

            // select a program from the dropdown
            $scope.open = function(program) {
                var actualProgram = program.$getDefaultVersion(),
                    programId = actualProgram.id,
                    programVersion = actualProgram.version,
                    path = $location.path(),
                    reviewMode = (path.search('/review') >= 0);

                // only TOC listing, eText, leveled readers, and standards can be "switched"
                // per Sparks, this could be done in resolve.js so we don't have to test everywhere
                if (program.externalSource === 'NBC Learn') {
                    // SHOULD be able to set the reject err to redirect to path of our choice in resolve.js
                    $location.path('nbclearn/browse');
                } else if (path.search('/eText') >= 0) {
                    $location.path('/program/' + programId + '/' + programVersion + '/eText');
                } else if (path.search('/leveledreaders') >= 0) {
                    $location.path('/program/' + programId + '/' + programVersion + '/leveledreaders');
                } else if (reviewMode) {
                    $location.search('lastSelectedGrade', null);
                    $location.path('/review/program/' + programId + '/' + programVersion + '/standards');
                } else if (path.search('/standards') >= 0 && !reviewMode) {
                    $location.search('lastSelectedGrade', null);
                    $location.path('/program/' + programId + '/' + programVersion + '/standards');
                } else if (path.search('/resources') >= 0) {
                    $location.path('/program/' + programId + '/' + programVersion + '/resources');
                } else {
                    if ($route.current.params.lastSelectedGrade) {
                        $location.search('lastSelectedGrade', null);
                    }
                    $location.path('/program/' + programId + '/' + programVersion);
                }
            };

            $scope.toolPreview = function(selectedTool) {
                $scope.toolsDocViewerUrl = ContentViewer.setDocViewerUrl($scope, selectedTool);
                Modal.toolDialog($scope, selectedTool, 'Solution');
            };

            $scope.openBrowseAllPrograms = function() {
                // Resetting browseAll components selected values.
                browseAllService.setCurrentPageIndex(1);
                browseAllService.setSelectedFacets({});
                browseAllService.setSelectedPrograms([]);
                browseAllService.setSearchKeyword('');
                browseAllEventTracking.onBrowseAllContent();
                $location.path('/browseAll');
            };

            $scope.isTeacher = function() {
                return $scope.currentUser.isTeacher;
            };

            // lazy load tools items if they aren't already loaded (via levels=2 or something)
            $scope.loadTools = function() {
                $scope.loadingTools = true;
                // TODO: replace with 'finally' in angular 1.2
                ProgramService.loadAssociatedTools($scope.currentProgram).then(
                    function() {
                        $scope.loadingTools = false;
                    }, function() {
                        $scope.loadingTools = false;
                    });
            };

            $scope.$on('window.breakpoint.change', function breakpointChanged() {
                $scope.$apply(function() {
                    $scope.shortenLabels = !MediaQuery.breakpoint.isDesktop;
                });
            });

            $scope.isTOCActive = function() {
                return ($location.path().search('/standards') === -1 &&
                        $location.path().search('/leveledreaders') === -1 &&
                        $location.path().search('/eText') === -1 &&
                        $location.path().search('/resources') === -1) || $location.path().search('/eText2') >= 0;
            };

            $scope.isStandardsActive = function() {
                return $location.path().search('/standards') >= 0;
            };

            $scope.isLeveledreadersActive = function() {
                return $location.path().search('/leveledreaders') >= 0;
            };

            $scope.isResourcesActive = function() {
                return $location.path().search('/resources') >= 0;
            };

            $scope.isETextActive = function() {
                return $location.path().search('/eText2') === -1 && $location.path().search('/eText') >= 0;
            };

            $scope.goToResources = function() {
                angular.forEach(ContentSource.PROVIDER, function(provider) {
                        provider = new ContentSource(provider);
                        provider.filterData.remove('resources.search.keyword');
                    });
                var inResources = $location.path().split('/resources')[1] &&
                        $location.path().split('/resources')[1].length > 1;
                if ($scope.isResourcesActive() && !inResources) {
                    $route.reload();
                } else {
                    var path = ['/program', $route.current.params.programId,
                       $route.current.params.programVersion, 'resources'].join('/');
                    $location.path(path);
                }
                $location.search({});
            };
        }
    ]);
