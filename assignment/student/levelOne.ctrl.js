angular.module('Realize.assignment.student.levelOneCtrl', [
    'Realize.analytics',
    'Realize.common.mediaQueryService',
    'Realize.content'
])
.controller('StudentAssignmentLevelOneCtrl', [
    '$scope',
    '$rootScope',
    '$location',
    'AssignmentFacadeService',
    'CountClasses',
    'RosterData',
    'AssignmentData',
    '$routeParams',
    '$log',
    'Content',
    '$timeout',
    'ASSIGNMENT_CONSTANTS',
    'webStorage',
    'MediaQuery',
    'featureManagementService',
    function($scope, $rootScope, $location, AssignmentFacadeService, CountClasses, RosterData, AssignmentData,
        $routeParams, $log, Content, $timeout, ASSIGNMENT_CONSTANTS, webStorage, MediaQuery, featureManagementService) {
        'use strict';

        var defaultTab = ASSIGNMENT_CONSTANTS.STATUS.NOT_STARTED;

        $scope.isDesktop = MediaQuery.breakpoint.isDesktop;

        $scope.classesCount = CountClasses;

        $scope.currentRoster = RosterData;
        $scope.notStartedData = AssignmentData;

        $scope.zeroState = (!AssignmentData.notStartedCount && !AssignmentData.inProgressCount &&
            !AssignmentData.completedCount);

        $scope.displayMode = {};

        $scope.activeTab = $routeParams.status || defaultTab;
        $scope.completionStatus = ASSIGNMENT_CONSTANTS.STATUS;

        // watch for activeTab changes
        $scope.$watch('activeTab', function(n) {
            $location.search('status', n).replace();
        });

        // search for assignment data
        AssignmentFacadeService.getAssignmentsWithExternalProviderData(AssignmentData)
            .then(function(result) {
            AssignmentData = result;
            $scope.pageLoaded();
        });

        // pre-defined variables
        $scope.etexts = [];
        $scope.tools = [];
        $scope.useSidebar = false;
        $scope.sidebarOpen = false;
        $scope.sidebarData = {};
        $scope.sidebarData.tools = []; // pre-define to avoid .itemRow divider line display issues
        var matchedId = [];

        var sidebarStateKey = 'studentEtextToolsClosed',
            store = webStorage.session;

        // search for matched product ids
        angular.forEach($scope.currentRoster.productIds, function(classProductId) {
            if ($scope.currentUser.productIdMap && $scope.currentUser.productIdMap[classProductId]) {
                matchedId.push($scope.currentUser.productIdMap[classProductId]);
            }
        });

        // if matched id, search for eText and Tools
        if (matchedId.length > 0) {
            var productIdQuery = matchedId;

            Content.getETexts(productIdQuery, true).then(function(etexts) {
                if (etexts && etexts.length && !store.get(sidebarStateKey)) {
                    $rootScope.$broadcast('sidebar:open');
                }
                $scope.sidebarData.etexts = etexts;
                $scope.useSidebar = true;
                $log.log('eTexts Loaded:', $scope.sidebarData.etexts);
            }, function(err) {
                $log.error('Error loading eTexts!', err);
            });

            Content.getToolsByPrograms(productIdQuery, true).then(function(tools) {
                if (tools && tools.length && !store.get(sidebarStateKey)) {
                    $rootScope.$broadcast('sidebar:open');
                }
                $scope.sidebarData.tools = tools;
                $scope.tools.sort(function(a, b) {
                    return (a.$getTitle().toLowerCase()).localeCompare(b.$getTitle().toLowerCase());
                });
                $scope.useSidebar = true;
                $log.log('Tools Loaded:', $scope.sidebarData.tools);
            }, function(err) {
                $log.error('Error loading tools:', err);
            });
        }

        if ($rootScope.justCompletedAssignment) {
            $scope.showAlert = $scope.completedAssignmentId = $rootScope.justCompletedAssignment;
            $rootScope.justCompletedAssignment = undefined;
        }

        // watch for eText and/or Tools to activate sidebar
        $scope.$watch('sidebarData', function(val) {
            if ((val.etexts && val.etexts.length >= 1) || (val.tools && val.tools.length >= 1)) {
                $scope.useSidebar = true;
            }

        });

        $scope.back = function() {
            var next;
            var backURL;
            if (!$rootScope.currentUser.isStudent) {
                next = $location.path().split('/student')[0] + '/assignments';
            } else {
                var isDashboardEnabled = featureManagementService.isShowDashboardAppEnabled();
                if (isDashboardEnabled) {
                    backURL = '/dashboard';
                } else {
                    backURL = '/';
                }
                next = $scope.classesCount < 2 ? backURL : '/classes';
            }
            $scope.goBack(next, true);
        };

        $scope.$on('sidebar:close', function() {
            store.add(sidebarStateKey, true);
            $scope.sidebarOpen = false;
            var timer = $timeout(function() {
                $scope.hideSidebarOpenLink = false;
            }, 155); // wait for the animation to complete
            $scope.$on('$destroy', function destroy() {
                $timeout.cancel(timer);
            });
        });

        $scope.$on('sidebar:open', function(e, arg) {
            store.remove(sidebarStateKey);
            $scope.indexFocus = arg && arg.userTriggered;
            $scope.sidebarOpen = true;
            $scope.hideSidebarOpenLink = true;
        });

        $scope.openSideBarEtext = function() {
            $rootScope.$broadcast('sidebar:open', {'userTriggered': true});
        };

        $scope.getSideBarLinkText = function() {
            var hasTools = $scope.sidebarData.tools && $scope.sidebarData.tools.length > 0,
                hasEText = $scope.sidebarData.etexts && $scope.sidebarData.etexts.length > 0,
                str = '';

            if (hasEText) {
                str = hasTools ? 'assignmentListStudent.action.showEtextTools' :
                    'assignmentListStudent.action.showTools';
            } else {
                str = 'assignmentListStudent.action.showEtext';
            }
            return $scope.getMessage(str);
        };

        $scope.$on('window.breakpoint.change', function bpChanged() {
            $scope.isDesktop = MediaQuery.breakpoint.isDesktop;
        });
    }
]);
