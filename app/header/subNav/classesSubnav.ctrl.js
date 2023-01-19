angular.module('Realize.header.subNav.classes', [
        'RealizeDataServices',
        'Realize.common.mediaQueryService',
        'Realize.constants.truncationLength'
    ])
    .controller('ClassesSubNavCtrl', [
        '$scope',
        '$rootScope',
        '$location',
        '$log',
        'ClassRoster',
        '$routeParams',
        'MediaQuery',
        '$route',
        'TRUNCATION_LENGTH',
        'locationUtilService',
        function($scope, $rootScope, $location, $log, ClassRoster, $routeParams, MediaQuery, $route, TRUNCATION_LENGTH,
            locationUtilService) {
            'use strict';

            $scope.rosters = [];

            var getTruncationLength = function() {
                var length;
                if (MediaQuery.breakpoint.isLargeTablet) {
                    length = TRUNCATION_LENGTH.LARGE_TABLET.CLASS_TITLE;
                } else if (MediaQuery.breakpoint.isSmallTablet) {
                    length = TRUNCATION_LENGTH.SMALL_TABLET.CLASS_TITLE;
                } else {
                    length = null;
                }
                return length;
            };

            $scope.truncateTo = getTruncationLength();

            var isStudent = $scope.currentUser.hasRole('ROLE_STUDENT');
            ClassRoster.get(isStudent ? {
                studentId: $scope.currentUser.userId
            } : null)
                .then(function(rosters) {
                    $scope.rosters = rosters;
                }, function(err) {
                    $log.error('error loading classes for subnav: ', err);
                });

            // filter the rosters for dropdown
            $scope.withoutCurrent = function(item) {
                return item.classId !== $routeParams.classId;
            };

            $scope.showSubNavigation = function() {
                var isDeepLinkActive = locationUtilService.isDeeplinkStudentAndGroupTabActive() || locationUtilService
                .isDeeplinkDiscussTabActive();
                if (isDeepLinkActive) {
                    $rootScope.hidePlatform = true;
                }
                return !isDeepLinkActive;
            };

            $scope.showClassSelection = function() {
                return !locationUtilService.isDeeplinkDataTabActive();
            };

            $scope.showGoogleClassIcon = function(roster) {
                return roster && roster.isGoogleClass() && !roster.googleLinkedClass;
            };

            $scope.open = function(roster) {
                var path = $location.path();
                if (path.search('/overview/assignment') >= 0) {
                    /**
                     * if inside an assignment on the data tab, remove assignment from path prior to navigating
                     * note: matches both /overview/assignment and /overview/assignments
                     */
                    path = path.split('assignment')[0];

                } else if (path.search('/assignments') >= 0) {
                    /**
                     * if viewing assignment in the context of a student, switching classes should
                     * revert to the main listing
                     */
                    if (path.search('student') >= 0 || path.search('discussPrompt') >= 0) {
                        path = '/classes/' + roster.classId + '/assignments';
                    } else {
                        // if inside an assignment on the classes tab, remove assignment from path prior to navigating
                        path = path.split('assignments')[0] + 'assignments';
                    }
                } else if (path.search('/calendar') >= 0) {
                    path = path.split('calendar')[0] + 'calendar';
                } else if (path.search('/discussPrompt') >= 0) {
                    path = path.split('discussPrompt')[0] + 'discussPrompt';
                } else if (path.search('/standards/students/') >= 0) {
                    //Individual Student report view -> go back to full class report
                    path = path.split('standards/students/')[0] + 'standards';
                }

                $location.path(path.replace($routeParams.classId, roster.classId));
            };

            $scope.$on('$routeChangeSuccess', function() {
                //needed because this is firing when you leave the page, not just entering it
                if ($routeParams.classId) {
                    ClassRoster.get($routeParams.classId)
                        .then(function(roster) {
                            $scope.currentRoster = roster;
                        });
                }

            });

            $scope.$on('window.breakpoint.change', function breakpointChanged() {
                $scope.$apply(function() {
                    $scope.truncateTo = getTruncationLength();
                });
            });

            $scope.activeAssignmentTab = function() {
                return $location.path().search('/assignments') >= 0  && !$location.search().discuss;
            };

            $scope.activeDiscussTab = function() {
                return $location.path().search('/discussPrompt') >= 0 && ($location.path().search('/assignments') < 0 ||
                !!$location.search().discuss && $location.search().discuss === 'active');
            };

            $scope.clickDiscussTab = function() {
                $location.search('activeTab', null);
                $location.search('promptView', null);
                var currentPath = $location.path(),
                    next = '/classes/' + $scope.currentRoster.classId + '/discussPrompt';
                if (next === currentPath) {
                    if ($route.current.scope.currentView === 'create' || $route.current.scope.currentView === 'edit') {
                        $route.current.scope.$emit('discuss.prompt.createView.change', 'active');
                    } else if ($route.current.scope.currentView === 'list') {
                        $route.current.scope.$emit('prompt.view.change', 'active');
                    }
                } else {
                    $location.path(next).search({});
                }
            };
        }
    ]);
