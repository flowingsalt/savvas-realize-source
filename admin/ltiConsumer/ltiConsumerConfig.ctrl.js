angular.module('Realize.admin.ltiConsumer.configController', [
    'Realize.paths'
])
    .controller('AdminLTIConsumerConfigController', [
        '$scope',
        '$routeParams',
        '$location',
        '$timeout',
        'PATH',
        function AdminLtiConsumerCtrl($scope, $routeParams, $location, $timeout, PATH) {
            'use strict';

            var templatesRoot = [PATH.TEMPLATE_CACHE, 'admin', 'ltiConsumer'].join('/'),
                tabTemplates = {
                    manage: [templatesRoot, 'manage', 'ltiConsumerManagement.html'].join('/'),
                    create: [templatesRoot, 'create', 'ltiConsumerCreateSetting.html'].join('/')
                },
                ctrl = this,
                timer;

            ctrl.back = function(e) {
                e.preventDefault();
                $scope.goBack('/admin/patools', true);
            };

            ctrl.uiState = {
                showAlert: false
            };

            ctrl.activeTab = $routeParams.activeTab || 'manage';

            //if ng-include="'some/path/file.html'" is in the template too quickly,
            // and that template brings in a controller with ng-controller,
            // then that controller can get instantiated twice due to $digest loop.
            //Putting in $timeout and making ng-include use src="scopeVariable" prevents that.
            timer = $timeout(function() {
                ctrl.tabTemplate = tabTemplates[ctrl.activeTab];
            }, 20);

            ctrl.showTab = function(tabName) {
                if (tabTemplates.hasOwnProperty(tabName)) {
                    $location.path('/admin/patools/ltiConsumer/' + tabName).replace();
                }
            };

            $scope.$on('ltiConsumerAdmin.showAlert', function(evt, alertDetails) {
                evt.preventDefault();
                ctrl.uiState.showAlert = true;
                ctrl.alertDetails = alertDetails;
            });

            $scope.$on('$destroy', function destroy() {
                $timeout.cancel(timer);
            });
        }
    ]);
