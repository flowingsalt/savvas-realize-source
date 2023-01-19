angular.module('Realize.admin.ltiConsumer.createSettingController', [
    'Realize.admin.ltiConsumer.common.LTIConsumerSettingsSvc',
    'Realize.admin.ltiConsumer.common.LTIConsumerSettingForm'
])
    .controller('LTIConsumerSettingCreateController', [
        '$scope',
        'LTIConsumerSettingsSvc',
        function CreateSettingCtrl($scope, LTIConsumerSettingsSvc) {
            'use strict';

            var ctrl = this;

            LTIConsumerSettingsSvc.list();

            ctrl.uiState = {
                isSubmitting: false,
                canSubmit: false
            };

            ctrl.triggerSave = function() {
                ctrl.uiState.isSubmitting = true;
                $scope.$broadcast('ltiConsumerSettingForm.submit');
            };

            ctrl.onSettingSaveError = function() {
                ctrl.uiState.isSubmitting = false;
            };

            ctrl.onSettingSaved = function() {
                //navigate to manage tab within LTI Consumer Admin
                $scope.ltiConfigCtrl.showTab('manage');
            };

            $scope.$on('ltiConsumerSettingForm.dirtied', function() {
                ctrl.uiState.canSubmit = true;
            });
        }
    ]);
