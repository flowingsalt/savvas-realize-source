angular.module('Realize.admin.commonCartridge.createKeysController', [
    'RealizeDataServices',
    'Realize.common.keyboardSupport.keyCodes',
    'Realize.admin.commonCartridge.keysetService'
])
    .controller('AdminCommonCartridgeCreateKeysController', [
        '$scope',
        'KEY_CODES',
        'lwcI18nFilter',
        'keysetService',
        function CreateKeysController(
            $scope,
            KEY_CODES,
            lwcI18nFilter,
            keysetService
        ) {
            'use strict';

            /*helpers*/
            function validateKeysetForCreation() {
                $scope.uiState.canCreateKeys = $scope.uiState.hasVerifiedOrgId &&
                    $scope.keyset.programs.length > 0;
            }

            function getNewKeyset() {
                return {
                    programs: [],
                    organizationId: '',
                    organization: undefined,
                    secret: undefined,
                    key: undefined
                };
            }

            $scope.keyset = getNewKeyset();

            $scope.uiState = {
                canCreateKeys: false,
                isCreatingKeys: false,
                isVerifyingOrgId: false,
                hasCreatedKeys: false,
                hasVerifiedInvalidOrgId: false,
                hasVerifiedOrgId: false,
                get isVerifyBtnDisabled() {
                    return ($scope.keyset.organizationId || '').length < 1 ||
                        this.isVerifyingOrgId ||
                        this.hasVerifiedOrgId ||
                        this.hasVerifiedInvalidOrgId;
                }
            };

            $scope.orgSearch = {
                verifyButtons: {
                    verify: lwcI18nFilter('commonCartridgeAdmin.createKeys.orgIdVerify'),
                    verified: lwcI18nFilter('commonCartridgeAdmin.createKeys.orgIdVerified')
                },
                error: '',
                errorMessages: {
                    noPrograms: lwcI18nFilter('commonCartridgeAdmin.createKeys.orgIdNotSubscribed'),
                    orgNotFound: lwcI18nFilter('commonCartridgeAdmin.createKeys.orgIdNotFound')
                }
            };

            $scope.orgIdKeyup = function onOrgIdKeyup(event) {
                if (angular.isDefined(event) && event.which === KEY_CODES.ENTER &&
                    !$scope.uiState.hasVerifiedOrgId && $scope.keyset.organizationId.length > 0) {
                    $scope.verifyOrgId();
                }
            };

            $scope.$watch('keyset.organizationId', function(oldVal, newVal) {
                if (oldVal !== newVal) {
                    $scope.uiState.hasVerifiedOrgId =
                        $scope.uiState.hasVerifiedInvalidOrgId =
                        $scope.uiState.canCreateKeys = false;
                }
            });

            $scope.verifyOrgId = function verifyOrgId() {
                $scope.uiState.isVerifyingOrgId = true;
                $scope.orgSearch.error = '';

                keysetService.getProgramsForOrg($scope.keyset.organizationId)
                    .then(function verified(orgPrograms) {
                        if (orgPrograms.length < 1) {
                            $scope.orgSearch.error = $scope.orgSearch.errorMessages.noPrograms;
                        } else {
                            $scope.fullProgramList =
                                $scope.typeAndSelectConfig.results = angular.copy(orgPrograms);

                            $scope.uiState.hasVerifiedOrgId = true;
                        }
                    })
                    .catch(function notVerified() {
                        $scope.orgSearch.error = $scope.orgSearch.errorMessages.orgNotFound;
                        $scope.uiState.hasVerifiedInvalidOrgId = true;
                    })
                    .finally(function() {
                        $scope.uiState.isVerifyingOrgId = false;
                    });
            };

            //type-and-select
            $scope.typeAndSelectConfig = {
                results: $scope.fullProgramList,
                formText: {
                    mainLabel: lwcI18nFilter('commonCartridgeAdmin.createKeys.programsSelect.mainLabel'),
                    help: lwcI18nFilter('commonCartridgeAdmin.createKeys.programsSelect.help'),
                    noMatch: lwcI18nFilter('commonCartridgeAdmin.createKeys.programsSelect.alert.noMatch'),
                    submitError: lwcI18nFilter('commonCartridgeAdmin.createKeys.programsSelect.alert.submitError'),
                    addAllLabel: lwcI18nFilter('commonCartridgeAdmin.createKeys.programsSelect.addAllLabel'),
                    offScreenRemove: lwcI18nFilter(
                        'commonCartridgeAdmin.createKeys.programsSelect.offScreenRemove.a11y'
                    ),
                    placeholder: lwcI18nFilter('commonCartridgeAdmin.createKeys.programsSelect.placeholder')
                },
                isAddAllEnabled: false,
                isFormSubmitted: function() {
                    return $scope.uiState.hasCreatedKeys;
                },
                customFilter: function($viewValue) {
                    return {
                        title: $viewValue
                    };
                },
                searchBufferMS: 300,
                popupMatchTmplUrl: 'templates/admin/commonCartridge/createKeys_programTypeaheadMatch.html',
                selectedItemTmplUrl: 'templates/admin/commonCartridge/createKeys_programTypeaheadSelectedItem.html'
            };

            $scope.$on('typeAndSelect.itemAdded', function() {
                $scope.setKeysetPrograms();
            });

            $scope.$on('typeAndSelect.itemRemoved', function() {
                $scope.setKeysetPrograms();
            });

            $scope.setKeysetPrograms = function() {
                $scope.keyset.programs = $scope.fullProgramList.filter(function isSelected(p) {
                    return p.selected === true;
                });
                validateKeysetForCreation();
            };

            $scope.createKeys = function() {

                validateKeysetForCreation();

                if ($scope.uiState.canCreateKeys) {
                    $scope.uiState.isCreatingKeys = true;

                    var orgId = $scope.keyset.organizationId;
                    var programIds = $scope.keyset.programs.map(function getId(program) {
                        return program.id;
                    });

                    keysetService.createKeyset(orgId, programIds)
                        .then(function gotKeyset(response) {
                            $scope.keyset.secret = response.data.secret;
                            $scope.keyset.key = response.data.consumerKey;
                            $scope.keyset.organizationName = response.data.consumerName;

                            //backend sends names of all subscribed programs as [string]
                            //this is because some things, like NBC Learn, won't be in the options in the UI,
                            //but will be part of the organizations subscriptions.
                            $scope.keyset.programs = response.data.products;

                            $scope.uiState.hasCreatedKeys = true;
                            $scope.uiState.canCreateKeys = false;
                        })
                        .catch(function noKeyset(err) {

                            var errorMsg = lwcI18nFilter(err.status === 404 ?
                                'commonCartridgeAdmin.createKeys.invalidOrgId' :
                                'commonCartridgeAdmin.createKeys.errorCreatingKeys'
                            );

                            $scope.$emit('commonCartridge.showAlert', {
                                autoClose: false,
                                type: 'error',
                                icon: 'exclamation-sign',
                                msg: errorMsg
                            });
                        })
                        .finally(function always() {
                            $scope.uiState.isCreatingKeys = false;
                        });
                }
            };

            $scope.createNewKeyset = function() {
                $scope.keyset = getNewKeyset();
                $scope.uiState.hasVerifiedOrgId = false;
                $scope.uiState.hasCreatedKeys = false;
                $scope.orgSearch.error = '';
                $scope.fullProgramList = [];
            };
        }
    ]);
