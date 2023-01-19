angular.module('Realize.admin.ltiConsumer.common.LTIConsumerSettingForm', [
    'Realize.paths',
    'Realize.admin.ltiConsumer.common.LTIConsumerSettingsSvc',
    'Realize.admin.ltiConsumer.common.LTIConsumerSettingModel',
    'Realize.ui.modal.UnsavedChangesModal',
    'RealizeDirectives'
])
    .directive('ltiConsumerSettingForm', [
        'PATH',
        function(PATH) {
            'use strict';

            return {
                restrict: 'EA',
                templateUrl: [
                    PATH.TEMPLATE_CACHE,
                    'admin',
                    'ltiConsumer',
                    'common',
                    'ltiConsumerSettingForm',
                    'ltiConsumerSettingForm.dir.html'].join('/'),
                controller: 'LTIConsumerSettingFormCtrl',
                controllerAs: 'ltiSettingFormCtrl',
                scope: {
                    onSave: '&',
                    onSaveError: '&',
                    consumerSetting: '=',
                    formDelegate: '='
                }
            };
        }])
    .controller('LTIConsumerSettingFormCtrl', [
        '$rootScope',
        '$scope',
        '$q',
        'lwcI18nFilter',
        'LTIConsumerSettingsSvc',
        'LTIConsumerSettingModel',
        'UnsavedChangesModal',
        '$location',
        'LTIMaxLengths',
        function LTIConsumerSettingFormCtrl($rootScope, $scope, $q, lwcI18nFilter,
            LTIConsumerSettingsSvc, LTIConsumerSettingModel, UnsavedChangesModal, $location, LTIMaxLengths) {

            'use strict';

            var ctrl = this,
                serverValidationsMap = {
                    INVALID_DOMAIN: {
                        formField: 'settingDomain',
                        error: 'pattern'
                    },
                    DUPLICATE_DOMAIN: {
                        formField: 'settingDomain',
                        error: 'duplicate'
                    },
                    DUPLICATE_CONFIGURATION_NAME: {
                        formField: 'settingName',
                        error: 'duplicate'
                    },
                    INVALID_CONFIGURATION_KEY: {
                        formField: 'settingKey',
                        error: 'pattern'
                    },
                    INVALID_CONFIGURATION_SECRET: {
                        formField: 'settingSecret',
                        error: 'pattern'
                    }
                };

            function setFormDirty() {
                if ($scope.settingForm) {
                    $scope.settingForm.$setDirty();
                }
            }

            ctrl.maxCustomFieldChars = LTIMaxLengths.maxCustomFieldLength;

            ctrl.editMode = $location.path() === '/admin/patools/ltiConsumer/manage';

            ctrl.soCloseAlert = {
                autoClose: false,
                type: 'error',
                icon: 'exclamation-sign',
                msg: lwcI18nFilter('ltiConsumerAdmin.validations.soCloseAlert')
            };

            ctrl.setting = angular.isDefined($scope.consumerSetting) ?
                angular.copy($scope.consumerSetting) :
                new LTIConsumerSettingModel();

            ctrl.uiState = {
                isCreate: !angular.isDefined($scope.consumerSetting),
                isSubmitting: false,
                showAlert: false,
                get shouldShowFormErrors() {
                    return $scope.settingForm.$dirty && !ctrl.uiState.canSubmit && !ctrl.uiState.isSubmitting;
                },
                get canSubmit() {
                    return ctrl.setting.hasAllRequiredFields() &&
                        ctrl.setting.hasValidKey() &&
                        ctrl.setting.hasValidSecret() &&
                        ctrl.setting.hasValidDomain() &&
                        !(LTIConsumerSettingsSvc.hasSettingForDomain(ctrl.setting.domain,
                            ctrl.setting.configurationUuid) ||
                        LTIConsumerSettingsSvc.hasSettingNamedSame(ctrl.setting.name, ctrl.setting.configurationUuid) ||
                        ctrl.setting.hasDuplicateCustomFields() ||
                        ctrl.setting.hasIncompleteCustomFields() ||
                        ctrl.setting.hasCustomFieldWithReservedKeyword());
                }
            };

            if (angular.isDefined($scope.formDelegate)) {
                Object.defineProperty($scope.formDelegate, 'isDirty', {
                    get: function() {
                        return $scope.settingForm.$dirty;
                    }
                });
            }

            ctrl.privacyLevelOpts = LTIConsumerSettingsSvc.privacySettings;
            ctrl.customFieldError = [];

            ctrl.setPrivacyLevel = function(level) {
                ctrl.setting.privacyLevel = level.value;
                ctrl.setting.privacyLevelLabel = level.label;
                setFormDirty();
            };

            ctrl.addCustomField = function() {
                ctrl.setting.addCustomField();
                var lastIndex = ctrl.setting.customFields.length - 1;
                ctrl.setting.customFields[lastIndex].showInput = false;
                ctrl.customFieldError.push(true);
                ctrl.setCustomField(ctrl.setting.customFields[lastIndex], '', lastIndex);
            };

            ctrl.customMultiSelectCheckboxes = [];

            ctrl.customFieldOpts = LTIConsumerSettingsSvc.custom()
                .then(function(response) {
                    ctrl.customFieldOpts = response;
                    ctrl.customFieldOptskeys = Object.keys(ctrl.customFieldOpts);
                    if (ctrl.editMode) {
                        var customFields = ctrl.setting.customFields;
                        if (ctrl.setting && customFields) {
                            angular.forEach(customFields, function(customField) {
                                customField.showInput = ctrl.checkCustomField(customField.value);
                                var selectedCustomFields = [];
                                if (!customField.showInput) {
                                    var customFieldValues = customField.value.split(',');
                                    customFieldValues.forEach(function(field) {
                                        selectedCustomFields[field] = true;
                                    });
                                }
                                ctrl.customFieldError.push(false);
                                ctrl.customMultiSelectCheckboxes.push(selectedCustomFields);
                            });
                        }
                    }
                });

            ctrl.setCustomMultiSelectValue = function(row) {
                ctrl.setting.customFields[row].value = ctrl.getCheckboxMultiSelectValues(row);
            };

            ctrl.getCheckboxMultiSelectValues = function(row) {
                var selectedCheckboxArray = [];
                var customCheckboxKey = Object.keys(ctrl.customMultiSelectCheckboxes[row]);
                customCheckboxKey.forEach(function(item) {
                    if (ctrl.customMultiSelectCheckboxes[row][item] === true) {
                        selectedCheckboxArray.push(item);
                    }
                });
                ctrl.customFieldError[row] = selectedCheckboxArray.length === 0;
                return selectedCheckboxArray.join();
            };

            ctrl.checkCustomField = function(customFieldValue) {
                return !(customFieldValue.includes(',') || ctrl.customFieldOptskeys.indexOf(customFieldValue) > -1);
            };

            ctrl.setCustomField = function(customField, level, index) {
                ctrl.customFieldError[index] = !customField.showInput;
                customField.value = level;
                setFormDirty();
            };

            ctrl.clearDropdown = function(index, customField) {
                if (ctrl.customMultiSelectCheckboxes[index]) {
                    ctrl.customFieldOptskeys.forEach(function(key) {
                        ctrl.customMultiSelectCheckboxes[index][key] = false;
                    });
                }
                if (customField) {
                    customField.showInput = false;
                }
                if (ctrl.setting.customFields && ctrl.setting.customFields[index]) {
                    ctrl.setCustomField(ctrl.setting.customFields[index], '', index);
                }
            };

            ctrl.removeCustomFieldAt = function(index) {
                ctrl.customFieldError.splice(index, 1);
                ctrl.customMultiSelectCheckboxes.splice(index, 1);
                ctrl.setting.removeCustomFieldAt(index);
                setFormDirty();
            };

            if (ctrl.uiState.isCreate) {
                ctrl.setPrivacyLevel(ctrl.privacyLevelOpts.filter(function(setting) {
                    return setting.value === 'NONE';
                })[0]);
            }

            ctrl.showInputField = function(index) {
                var customFields = ctrl.setting.customFields;
                if (ctrl.setting && customFields) {
                    customFields[index].showInput = true;
                    customFields[index].value = '';
                    ctrl.customFieldError[index] = false;
                }
            };

            ctrl.saveSetting = function(fromModal) {
                if (!$scope.settingForm.$dirty) {
                    return false;
                }

                if (!ctrl.uiState.canSubmit) {
                    if (fromModal) {
                        return $q.reject('Invalid Form Data');
                    } else {
                        ctrl.alertDetails = ctrl.soCloseAlert;
                        ctrl.uiState.showAlert = true;
                        if ($scope.onSaveError && angular.isFunction($scope.onSaveError)) {
                            $scope.onSaveError();
                        }
                    }
                } else {
                    ctrl.uiState.isSubmitting = true;

                    var savePromise = ctrl.uiState.isCreate ?
                        LTIConsumerSettingsSvc.add(ctrl.setting) :
                        LTIConsumerSettingsSvc.update(ctrl.setting);

                    savePromise.catch(function(err) {
                        if ($scope.onSaveError && angular.isFunction($scope.onSaveError)) {
                            $scope.onSaveError({error: err.data});
                        }

                        var validationForServerError = serverValidationsMap[err.data.errorMessage];

                        if (angular.isDefined(validationForServerError)) {
                            $scope.settingForm[validationForServerError.formField]
                                .$setValidity(validationForServerError.error, false);
                        } else {
                            ctrl.alertDetails = {
                                autoClose: false,
                                type: 'error',
                                icon: 'exclamation-sign',
                                msg: ctrl.soCloseAlert.msg
                            };

                            ctrl.uiState.showAlert = true;
                            ctrl.uiState.isSubmitting = false;
                        }
                    });

                    if (fromModal) {
                        var defer = $q.defer();

                        savePromise.then(function() {
                            defer.resolve();
                        });
                        savePromise.catch(function() {
                            defer.reject('Error saving');
                        });

                        return defer.promise;
                    } else {
                        savePromise.then(function() {
                            if ($scope.onSave && angular.isFunction($scope.onSave)) {
                                $scope.onSave({setting: ctrl.setting});
                            }
                        });
                    }
                }
            };

            var unwatchFormDirty = $scope.$watch(function() {
                return $scope.settingForm.$dirty;
            }, function() {
                if ($scope.settingForm.$dirty) {
                    $scope.$emit('ltiConsumerSettingForm.dirtied');
                    unwatchFormDirty();
                }
            });

            $scope.$watch(function() {
                return ctrl.setting;
            }, function(newVal, oldVal) {
                if (angular.isDefined(oldVal) && $scope.settingForm.$dirty && newVal !== oldVal) {
                    //set validations
                    $scope.settingForm.settingKey.$setValidity('pattern', ctrl.setting.hasValidKey());
                    $scope.settingForm.settingSecret.$setValidity('pattern', ctrl.setting.hasValidSecret());
                    $scope.settingForm.settingDomain.$setValidity('pattern', ctrl.setting.hasValidDomain());
                    $scope.settingForm.settingDomain.$setValidity('duplicate',
                        !LTIConsumerSettingsSvc.hasSettingForDomain(
                            ctrl.setting.domain,
                            ctrl.setting.configurationUuid
                        )
                    );
                    $scope.settingForm.settingName.$setValidity('duplicate',
                        !LTIConsumerSettingsSvc.hasSettingNamedSame(ctrl.setting.name, ctrl.setting.configurationUuid));
                }
            }, true);

            $scope.$on('ltiConsumerSettingForm.submit', function() {
                ctrl.saveSetting();
            });

            ctrl.unsavedChangesModal = new UnsavedChangesModal(ctrl.saveSetting.bind(ctrl, true));

            var offLocationChangeStart = $rootScope.$on('$locationChangeStart', function(evt) {
                if ($scope.settingForm.$dirty && !ctrl.uiState.isSubmitting) {
                    ctrl.unsavedChangesModal.showDialog(evt);
                    $rootScope.viewLoading = false;
                }
            });

            $scope.$on('$destroy', offLocationChangeStart);
        }
    ]);
