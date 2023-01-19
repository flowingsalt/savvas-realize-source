angular.module('Realize.standards.standardTreeItemDirective', [
    'Realize.standards.standardDataService',
    'Realize.analytics'
])
    .directive('standardTreeItem', [
        function() {
            'use strict';

            return {
                restrict: 'A',
                controller: [
                    '$scope',
                    '$location',
                    '$routeParams',
                    '$rootScope',
                    'Standard',
                    'Analytics',
                    function($scope, $location, $routeParams, $rootScope, StandardService, Analytics) {

                        var programId = $routeParams.programId,
                            programVersion = $routeParams.programVersion,
                            standard = $scope.obj;

                        function isReviewMode () {
                            var isReviewer = $rootScope.currentUser.isReviewer,
                                path = $location.path().split('/'),
                                isReviewTab = path.indexOf('review') > -1;

                            return isReviewer && isReviewTab;
                        }

                        function openReviewerStandard (standard) {
                            if (standard.children && standard.children.length) {
                                standard.expanded = !standard.expanded;
                            } else {
                                $location.path(
                                    '/review/program/' + programId + '/' + programVersion + '/standards/' +
                                    StandardService.urlEncode(standard.id)
                                );
                                $location.search('grade', StandardService.urlEncode(standard.grade));
                            }
                        }

                        function openStandardSearch (standard) {
                            if ($rootScope.currentUser.isLibraryAdmin || $rootScope.currentUser.isContentReviewer ||
                                standard.count > 0) {
                                $location.path(
                                    StandardService.getSearchRoute(standard, programId, programVersion, standard.grade)
                                );
                            }
                        }

                        $scope.open = isReviewMode() ? openReviewerStandard : openStandardSearch;

                        $scope.$watch('obj.expanded', function(isExpanded) {
                            StandardService[(isExpanded) ? 'setOpen' : 'setClosed'](standard.id);
                            if (!isExpanded && standard.children) {
                                _.each(standard.children, function(child) {
                                    child.expanded = false;
                                });
                            }

                            if (isExpanded) {
                                Analytics.track('programs.action', {
                                    program: $rootScope.currentProgram,
                                    label: 'Standards expand (' + standard.number + (standard.title ? ' / ' +
                                        standard.title : '') + ')'
                                });
                            }
                        });

                        standard.expanded = StandardService.isOpen(standard.id);

                    }
                ]
            };
        }
    ]);
