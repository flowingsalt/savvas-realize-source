angular.module('Realize.admin.commonCartridge.cartridgeManagementController', [
    'Realize.user.currentUser',
    'Realize.paths'
])
    .controller('AdminCommonCartridgeManagementController', [
        '$scope',
        '$routeParams',
        '$location',
        '$timeout',
        'PATH',
        '$currentUser',
        function AdminCCMgmtCtrl($scope, $routeParams, $location, $timeout, PATH, $currentUser) {
            'use strict';

            var ccTemplatesRoot = [PATH.TEMPLATE_CACHE, 'admin', 'commonCartridge'].join('/'),
                tabTemplates = {
                    exportCartridge: [ccTemplatesRoot, 'cartridgeExport.html'].join('/'),
                    cartridgeRepository: [ccTemplatesRoot, 'cartridgeRepository.html'].join('/'),
                    createKeys: [ccTemplatesRoot, 'createKeys.html'].join('/'),
                    manageKeys: [ccTemplatesRoot, 'manageKeys.html'].join('/')
                },
                timer;

            $scope.back = function(e) {
                e.preventDefault();
                $scope.goBack('/admin/patools', true);
            };

            $scope.activeTab = $routeParams.activeTab || 'exportCartridge';
            //if ng-include="'some/path/file.html'" is in the template too quickly,
            // and that template brings in a controller with ng-controller,
            // then that controller can get instantiated twice due to $digest loop.
            //Putting in $timeout and making ng-include use src="scopeVariable" prevents that.
            timer = $timeout(function() {
                $scope.tabTemplate = tabTemplates[$scope.activeTab];
            }, 20);

            $scope.uiState = {
                showExportInfo: $scope.activeTab === 'exportCartridge' &&
                    $currentUser.getAttribute('commonCartridgeExport.hasSeenExportInfo') !== true
            };

            if ($scope.uiState.showExportInfo) {
                $scope.closeFirstExportInfo = function() {
                    $currentUser.setAttribute('commonCartridgeExport.hasSeenExportInfo', true);
                    $scope.uiState.showExportInfo = false;
                };
            }

            $scope.showTab = function showTab(tab) {
                $location.path('/admin/patools/commoncartridge/' + tab).replace();
                $scope.activeTab = tab;
            };

            $scope.$on('commonCartridge.showAlert', function alertUser(evt, alertDetails) {
                evt.preventDefault();
                $scope.alertIsSet = true;
                $scope.alertDetails = alertDetails;
            });

            $scope.$on('$destroy', function destroy() {
                $timeout.cancel(timer);
            });
        }
    ]);
