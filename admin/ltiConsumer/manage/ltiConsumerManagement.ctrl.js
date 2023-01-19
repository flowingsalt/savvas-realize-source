angular.module('Realize.admin.ltiConsumer.managementController', [
    'Realize.admin.ltiConsumer.common.LTIConsumerSettingsSvc',
    'Realize.admin.ltiConsumer.common.LTIConsumerSettingForm'
])
    .controller('LTIConsumerMgmtController', [
        '$scope',
        '$timeout',
        'LTIConsumerSettingsSvc',
        function LTIConsumerMgmtCtrl($scope, $timeout, LTIConsumerSettingsSvc) {
            'use strict';

            var ctrl = this,
                timer;

            function collapseAllRows() {
                if (ctrl.ltiSettingsList && ctrl.ltiSettingsList.length > 0) {
                    ctrl.ltiSettingsList.forEach(function(setting) {
                        setting.expanded = false;
                    });
                }
            }

            LTIConsumerSettingsSvc.list().then(function(ltiSettings) {
                ctrl.ltiSettingsList = ltiSettings;
                ctrl.pagerData.totalItems = ltiSettings.length;
                ctrl.pagerData.endIndex = ctrl.pagerData.pageSize - 1;

                ctrl.uiState.isLoadingSettings = false;
                timer = $timeout(function() {
                    //keep spinner and zero-state message from displaying concurrently
                    ctrl.uiState.zeroState = ltiSettings.length === 0;
                }, 0);
            });

            ctrl.uiState = {
                editMode: false,
                hasEditedSetting: false,
                isLoadingSettings: true,
                zeroState: false
            };

            ctrl.showTab = function(tabName) {
                //benefit of controllerAs syntax - no need to use $parent
                //can access controller instance per named property on $scope service
                $scope.ltiConfigCtrl.showTab(tabName);
            };

            ctrl.sortField = '-lastUpdated';
            ctrl.sortBy = function(fieldName) {
                if (ctrl.uiState.editMode) {
                    return false;
                }

                collapseAllRows();

                var sign = '+';
                if (ctrl.sortField.substr(1) === fieldName) {
                    sign = ctrl.sortField[0] === '+' ? '-' : '+';
                }
                ctrl.sortField = sign + fieldName;
            };

            ctrl.expandRow = function(event, setting) {
                if (ctrl.uiState.editMode || event.isDefaultPrevented()) {
                    return false;
                }

                if (setting.expanded) {
                    setting.expanded = false;
                    return;
                }

                collapseAllRows();
                setting.expanded = true;
            };

            ctrl.enterEditMode = function(event, setting) {
                event.preventDefault();

                if (ctrl.uiState.editMode) {
                    return false;
                }

                collapseAllRows();
                setting.expanded = false;
                ctrl.uiState.editMode = true;
                ctrl.settingToEdit = setting;
            };

            ctrl.cancelEditMode = function() {
                ctrl.uiState.hasEditedSetting = false;
                ctrl.uiState.editMode = false;
                ctrl.settingToEdit = undefined;
            };

            ctrl.saveEditedSetting = function() {
                if (ctrl.uiState.hasEditedSetting) {
                    $scope.$broadcast('ltiConsumerSettingForm.submit');
                } else {
                    ctrl.cancelEditMode();
                }
            };

            ctrl.onSettingSaved = function(updatedSetting) {
                var settingToUpdate = ctrl.ltiSettingsList.filter(function(setting) {
                    return setting.configurationUuid === updatedSetting.configurationUuid;
                })[0],
                    settingIdx = ctrl.ltiSettingsList.indexOf(settingToUpdate);

                //clear custom fields that have both key and value as blank
                //as they are allowed in the form but ignored by service
                updatedSetting.customFields = updatedSetting.customFields.filter(function(cf) {
                    return (cf.key || '').length > 0 && (cf.value || '').length > 0;
                });

                ctrl.ltiSettingsList.splice(settingIdx, 1, updatedSetting);

                ctrl.cancelEditMode();
            };

            ctrl.deleteSetting = function(event, setting) {
                event.preventDefault();

                if (ctrl.uiState.editMode) {
                    return false;
                }

                LTIConsumerSettingsSvc.delete(setting.configurationUuid).then(function() {
                    setting.deleted = true;
                    //setting can be deleted while the row is expanded, so ensure it is set back to false
                    setting.expanded = false;
                });
            };

            ctrl.undeleteSetting = function(setting) {
                if (ctrl.uiState.editMode) {
                    return false;
                }

                LTIConsumerSettingsSvc.undelete(setting.configurationUuid).then(function() {
                    setting.deleted = false;
                });
            };

            $scope.currentPage = 1;
            ctrl.pagerData = $scope.pagerData = {
                startIndex: 0,
                endIndex: 9,
                pageSize: 10,
                get currentPage() {
                    return $scope.currentPage;
                },
                set currentPage(num) {
                    $scope.currentPage = num;
                },
                totalItems: 0
            };

            $scope.$watch('currentPage', function() {

                collapseAllRows();

                ctrl.pagerData.startIndex = (ctrl.pagerData.currentPage - 1) * ctrl.pagerData.pageSize;
                ctrl.pagerData.endIndex = (ctrl.pagerData.currentPage * ctrl.pagerData.pageSize) - 1;

                if (ctrl.pagerData.totalItems < ctrl.pagerData.endIndex + 1) {
                    ctrl.pagerData.endIndex = ctrl.pagerData.totalItems - 1;
                }
            }, true);

            $scope.$on('ltiConsumerSettingForm.dirtied', function() {
                ctrl.uiState.hasEditedSetting = true;
            });

            $scope.$on('$destroy', function destroy() {
                $timeout.cancel(timer);
            });
        }
    ]);
